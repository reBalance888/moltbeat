/**
 * Barcode handler - Scan products and track consumption
 * Supports both text input and photo scanning
 */
import { Markup } from 'telegraf';
import { BotContext } from '../types';
import { DB } from '../database/db';
import { BarcodeScanner } from '../services/barcode-scanner';

/**
 * Handle barcode scan (text input)
 */
export async function handleBarcodeScan(ctx: BotContext, db: DB, barcode: string) {
  const userId = ctx.from!.id;
  const user = db.getUser(userId);

  if (!user) {
    await ctx.reply('Сначала зарегистрируйся с помощью /start');
    return;
  }

  // Show loading message
  const loadingMsg = await ctx.reply('🔍 Ищу продукт по штрих-коду...');

  try {
    // Fetch product from Open Food Facts
    const product = await BarcodeScanner.getProductByBarcode(barcode);

    if (!product) {
      await ctx.telegram.editMessageText(
        ctx.chat!.id,
        loadingMsg.message_id,
        undefined,
        `❌ Продукт с кодом ${barcode} не найден в базе.\n\n` +
        'Попробуй отсканировать другой штрих-код или добавить продукт вручную.'
      );
      return;
    }

    // Build product info message
    let message = `✅ <b>Продукт найден!</b>\n\n`;
    message += `📦 <b>${product.name}</b>\n`;
    if (product.brand) message += `🏷 ${product.brand}\n`;
    message += `📊 КБЖУ (на ${product.quantity}):\n`;
    message += `🔥 Калории: ${product.calories} ккал\n`;
    message += `💪 Белки: ${product.protein} г\n`;
    message += `🥑 Жиры: ${product.fats} г\n`;
    message += `🍞 Углеводы: ${product.carbs} г\n\n`;

    // Calculate remaining calories
    const todayMeals = db.getTodayMeals(userId);
    const consumedCalories = todayMeals.reduce((sum, meal) => sum + meal.calories, 0);
    const remainingCalories = (user.daily_calories || 2000) - consumedCalories;

    message += `💡 Осталось на сегодня: <b>${remainingCalories} ккал</b>\n`;
    message += `⚠️ После съедения останется: <b>${remainingCalories - product.calories} ккал</b>`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('✅ Съел(а)', `barcode_consume_${barcode}`)],
      [Markup.button.callback('📦 Добавить в продукты', `barcode_add_${barcode}`)],
      [Markup.button.callback('❌ Отмена', 'barcode_cancel')]
    ]);

    // Store product data in session for later use
    ctx.session.tempBarcodeProduct = product;

    await ctx.telegram.editMessageText(
      ctx.chat!.id,
      loadingMsg.message_id,
      undefined,
      message,
      {
        parse_mode: 'HTML',
        ...keyboard
      }
    );

  } catch (error) {
    console.error('Error processing barcode:', error);
    await ctx.telegram.editMessageText(
      ctx.chat!.id,
      loadingMsg.message_id,
      undefined,
      '❌ Ошибка при обработке штрих-кода. Попробуй еще раз.'
    );
  }
}

/**
 * Consume scanned product (log as meal)
 */
export async function consumeScannedProduct(ctx: BotContext, db: DB, barcode: string) {
  const userId = ctx.from!.id;
  const product = ctx.session.tempBarcodeProduct;

  if (!product || product.barcode !== barcode) {
    await ctx.answerCbQuery('Данные продукта не найдены. Отсканируй заново.', { show_alert: true });
    return;
  }

  // Log as snack
  db.addMealLog(
    userId,
    undefined, // no recipe
    product.name,
    'snack',
    product.calories,
    product.protein,
    product.fats,
    product.carbs,
    1.0
  );

  // Calculate new remaining calories
  const user = db.getUser(userId);
  const todayMeals = db.getTodayMeals(userId);
  const consumedCalories = todayMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const remainingCalories = (user!.daily_calories || 2000) - consumedCalories;

  let message = `✅ <b>Записано в дневник!</b>\n\n`;
  message += `Съедено: <b>${product.name}</b> (${product.calories} ккал)\n`;
  message += `Осталось на сегодня: <b>${remainingCalories} ккал</b>`;

  if (remainingCalories < 0) {
    message += `\n\n⚠️ Ты превысил(а) дневную норму на ${Math.abs(remainingCalories)} ккал!`;
  }

  // Clean up session
  delete ctx.session.tempBarcodeProduct;

  await ctx.editMessageText(message, { parse_mode: 'HTML' });
  await ctx.answerCbQuery('✅ Записано');
}

/**
 * Add scanned product to shopping list
 */
export async function addScannedProduct(ctx: BotContext, db: DB, barcode: string) {
  const userId = ctx.from!.id;
  const product = ctx.session.tempBarcodeProduct;

  if (!product || product.barcode !== barcode) {
    await ctx.answerCbQuery('Данные продукта не найдены. Отсканируй заново.', { show_alert: true });
    return;
  }

  // Add to products with nutrition data
  db.addProduct(
    userId,
    product.name,
    product.quantity,
    'available',
    undefined, // no discount
    undefined, // no expiry
    product.barcode,
    product.calories,
    product.protein,
    product.fats,
    product.carbs
  );

  let message = `✅ <b>Добавлено в продукты!</b>\n\n`;
  message += `${product.name}\n`;
  message += `${product.calories} ккал / ${product.protein}г / ${product.fats}г / ${product.carbs}г`;

  // Clean up session
  delete ctx.session.tempBarcodeProduct;

  await ctx.editMessageText(message, { parse_mode: 'HTML' });
  await ctx.answerCbQuery('✅ Добавлено');
}

/**
 * Cancel barcode scan
 */
export async function cancelBarcodeScan(ctx: BotContext) {
  delete ctx.session.tempBarcodeProduct;
  await ctx.editMessageText('❌ Отменено');
  await ctx.answerCbQuery();
}

/**
 * Handle photo barcode scan
 */
export async function handlePhotoBarcodeScan(ctx: BotContext, db: DB) {
  const userId = ctx.from!.id;
  const user = db.getUser(userId);

  if (!user) {
    await ctx.reply('Сначала зарегистрируйся с помощью /start');
    return;
  }

  // Check if message has photo
  if (!ctx.message || !('photo' in ctx.message)) {
    await ctx.reply('Отправь мне фото штрих-кода');
    return;
  }

  const photo = ctx.message.photo;
  if (!photo || photo.length === 0) {
    await ctx.reply('Не удалось получить фото');
    return;
  }

  // Show processing message
  const processingMsg = await ctx.reply('📸 Обрабатываю фото...\n🔍 Ищу штрих-код...');

  try {
    // Get highest quality photo
    const photoFile = photo[photo.length - 1];

    // Get file URL from Telegram
    const file = await ctx.telegram.getFile(photoFile.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

    // Scan barcode from image
    const barcode = await BarcodeScanner.scanBarcodeFromTelegramFile(fileUrl);

    if (!barcode) {
      await ctx.telegram.editMessageText(
        ctx.chat!.id,
        processingMsg.message_id,
        undefined,
        '❌ Не удалось распознать штрих-код на фото.\n\n' +
        '💡 Советы:\n' +
        '• Убедись что штрих-код чёткий\n' +
        '• Сфотографируй ближе и прямо\n' +
        '• Хорошее освещение\n' +
        '• Или введи цифры вручную: 4600309032164'
      );
      return;
    }

    // Delete processing message
    await ctx.telegram.deleteMessage(ctx.chat!.id, processingMsg.message_id);

    // Process barcode (reuse existing handler)
    await handleBarcodeScan(ctx, db, barcode);

  } catch (error) {
    console.error('Error processing barcode photo:', error);
    await ctx.telegram.editMessageText(
      ctx.chat!.id,
      processingMsg.message_id,
      undefined,
      '❌ Ошибка при обработке фото. Попробуй ещё раз или введи цифры вручную.'
    );
  }
}
