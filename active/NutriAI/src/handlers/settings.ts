/**
 * Settings handler - User settings and profile editing
 */
import { Markup } from 'telegraf';
import { BotContext } from '../types';
import { DB } from '../database/db';

/**
 * Show settings menu
 */
export async function showSettings(ctx: BotContext, db: DB) {
  const userId = ctx.from!.id;
  const user = db.getUser(userId);

  if (!user) {
    await ctx.reply('Сначала зарегистрируйтесь с помощью /start');
    return;
  }

  let message = '⚙️ <b>НАСТРОЙКИ</b>\n\n';
  message += `👤 Имя: ${user.name}\n`;
  message += `📏 Рост: ${user.height} см\n`;
  message += `⚖️ Текущий вес: ${user.current_weight} кг\n`;
  message += `🎯 Целевой вес: ${user.target_weight} кг\n`;
  message += `👶 Возраст: ${user.age} лет\n`;
  message += `👨/👩 Пол: ${user.gender === 'male' ? 'Мужской' : 'Женский'}\n`;

  const activityNames: any = {
    sedentary: '🛋 Минимальная',
    light: '🚶 Легкая',
    moderate: '🏃 Умеренная',
    active: '💪 Интенсивная',
    very_active: '🔥 Очень интенсивная'
  };
  message += `🏃 Активность: ${activityNames[user.activity_level!] || user.activity_level}\n`;

  const goalNames: any = {
    weight_loss: '📉 Похудеть',
    weight_gain: '📈 Набрать массу',
    maintain: '➡️ Поддерживать'
  };
  message += `🎯 Цель: ${goalNames[user.goal!] || user.goal}\n\n`;

  message += `📊 <b>Норма калорий:</b>\n`;
  message += `🔥 ${user.daily_calories} ккал/день\n`;
  message += `💪 Белки: ${user.daily_protein} г\n`;
  message += `🥑 Жиры: ${user.daily_fats} г\n`;
  message += `🍞 Углеводы: ${user.daily_carbs} г\n\n`;

  message += `💡 Чтобы изменить параметры, пройди регистрацию заново: /start`;

  await ctx.reply(message, { parse_mode: 'HTML' });
}

/**
 * Log weight entry
 */
export async function logWeight(ctx: BotContext, db: DB) {
  const userId = ctx.from!.id;
  const user = db.getUser(userId);

  if (!user) {
    await ctx.reply('Сначала зарегистрируйтесь с помощью /start');
    return;
  }

  // Start weight logging conversation
  ctx.session.step = 'log_weight';

  await ctx.reply(
    `⚖️ <b>Взвешивание</b>\n\n` +
    `Текущий вес в системе: ${user.current_weight} кг\n\n` +
    `Введи свой новый вес (в кг):`,
    { parse_mode: 'HTML' }
  );
}

/**
 * Handle weight logging flow
 */
export async function handleWeightLogging(ctx: BotContext, db: DB) {
  if (!ctx.message || !('text' in ctx.message)) return;
  const text = ctx.message.text;

  try {
    const weight = parseFloat(text.trim().replace(',', '.'));

    if (weight < 30 || weight > 300) {
      await ctx.reply('❌ Введи реальный вес (от 30 до 300 кг)');
      return;
    }

    const userId = ctx.from!.id;
    const user = db.getUser(userId);

    if (!user) {
      await ctx.reply('Ошибка: пользователь не найден');
      return;
    }

    const oldWeight = user.current_weight!;
    const diff = weight - oldWeight;
    const diffText = diff > 0
      ? `+${diff.toFixed(1)} кг 📈`
      : diff < 0
        ? `${diff.toFixed(1)} кг 📉`
        : `без изменений ➡️`;

    // Log weight
    db.logWeight(userId, weight);

    // Update current weight
    db.updateUser(userId, { current_weight: weight });

    // Clear session
    delete ctx.session.step;

    // Calculate progress
    const targetWeight = user.target_weight!;
    const totalToLose = oldWeight - targetWeight;
    const lost = oldWeight - weight;
    const remaining = weight - targetWeight;
    const progress = totalToLose > 0 ? Math.round((lost / totalToLose) * 100) : 0;

    let message = `✅ <b>Вес записан!</b>\n\n`;
    message += `⚖️ Вес: ${weight} кг (${diffText})\n`;
    message += `🎯 Цель: ${targetWeight} кг\n`;
    message += `📊 Осталось: ${remaining.toFixed(1)} кг\n`;
    message += `📈 Прогресс: ${progress}%\n\n`;

    if (diff < 0) {
      message += `🎉 Отлично! Ты двигаешься к цели!`;
    } else if (diff > 0) {
      message += `⚠️ Небольшой откат, но это нормально! Продолжай!`;
    } else {
      message += `➡️ Вес не изменился. Следи за калориями!`;
    }

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...Markup.keyboard([
        ['📊 Статистика', '🍽 Рецепты'],
        ['🛒 Продукты', '➕ Добавить прием пищи'],
        ['⚖️ Взвеситься', '⚙️ Настройки']
      ]).resize()
    });

  } catch (error) {
    await ctx.reply('❌ Введи число (например: 102.5)');
  }
}
