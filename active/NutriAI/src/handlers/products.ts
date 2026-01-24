/**
 * Products handler - Manage shopping list (SMART system)
 */
import { Markup } from 'telegraf';
import { BotContext, ProductStatus } from '../types';
import { DB } from '../database/db';

/**
 * Show products list grouped by status
 */
export async function showProducts(ctx: BotContext, db: DB) {
  const userId = ctx.from!.id;
  const products = db.getUserProducts(userId);

  if (products.length === 0) {
    await ctx.reply(
      '🛒 <b>Твой список продуктов пуст</b>\n\n' +
      'Отправь мне название продукта, чтобы добавить его в список.\n' +
      'Например: "Молоко 1л" или "Яйца"\n\n' +
      '💡 Можешь указать статус:\n' +
      '• По умолчанию - есть дома ✅\n' +
      '• "+едет Молоко" - в пути 📦\n' +
      '• "+заказан Хлеб" - заказано 🛒',
      { parse_mode: 'HTML' }
    );
    return;
  }

  // Group products by status
  const available = products.filter(p => p.status === 'available');
  const incoming = products.filter(p => p.status === 'incoming');
  const ordered = products.filter(p => p.status === 'ordered');

  let message = '🛒 <b>SMART Список продуктов</b>\n\n';

  // Available products
  if (available.length > 0) {
    message += '✅ <b>Есть дома</b>\n';
    available.forEach((product) => {
      message += formatProduct(product);
    });
    message += '\n';
  }

  // Incoming products
  if (incoming.length > 0) {
    message += '📦 <b>В пути</b>\n';
    incoming.forEach((product) => {
      message += formatProduct(product);
    });
    message += '\n';
  }

  // Ordered products
  if (ordered.length > 0) {
    message += '🛒 <b>Заказано</b>\n';
    ordered.forEach((product) => {
      message += formatProduct(product);
    });
    message += '\n';
  }

  message += '💡 Добавить: просто напиши название\n';
  message += '💡 Со статусом: "+едет Молоко" или "+заказан Хлеб"';

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('📦→✅ Приехало', 'products_arrived'),
      Markup.button.callback('🛒→📦 Отправлено', 'products_shipped')
    ],
    [Markup.button.callback('🗑 Очистить всё', 'products_clear')]
  ]);

  await ctx.reply(message, {
    parse_mode: 'HTML',
    ...keyboard
  });
}

/**
 * Format product display string
 */
function formatProduct(product: any): string {
  let line = `• ${product.name}`;

  if (product.quantity) {
    line += ` - ${product.quantity}`;
  }

  if (product.discount && product.discount > 0) {
    line += ` 💰 -${product.discount}%`;
  }

  if (product.expires_at) {
    const daysLeft = getDaysUntilExpiry(product.expires_at);
    if (daysLeft <= 3) {
      line += ` ⚠️ ${daysLeft}д`;
    } else if (daysLeft <= 7) {
      line += ` 📅 ${daysLeft}д`;
    }
  }

  if (product.calories) {
    line += ` (${product.calories} ккал)`;
  }

  line += '\n';
  return line;
}

/**
 * Calculate days until expiry
 */
function getDaysUntilExpiry(expiresAt: string): number {
  const expiry = new Date(expiresAt);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Add product to list (with smart parsing)
 */
export async function addProduct(ctx: BotContext, db: DB, productText: string) {
  const userId = ctx.from!.id;
  const text = productText.trim();

  // Validate input
  if (!text || text.length < 2) {
    await ctx.reply('Название продукта слишком короткое. Напиши название продукта, например: "Молоко 1л"');
    return;
  }

  // Ignore emoji-only messages
  const emojiOnlyRegex = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/u;
  if (emojiOnlyRegex.test(text)) {
    // Silently ignore emoji-only messages (likely button clicks)
    return;
  }

  // Parse status prefix
  let status: ProductStatus = 'available';
  let name = text;

  if (text.toLowerCase().startsWith('+едет ')) {
    status = 'incoming';
    name = text.slice(6).trim();
  } else if (text.toLowerCase().startsWith('+заказан ')) {
    status = 'ordered';
    name = text.slice(9).trim();
  }

  // Validate that name is not empty after removing prefix
  if (!name || name.length < 2) {
    await ctx.reply('Укажи название продукта после "+едет" или "+заказан".\nНапример: "+едет Молоко 1л"');
    return;
  }

  // Try to parse discount (e.g., "Молоко -30%")
  let discount: number | undefined;
  const discountMatch = name.match(/-(\d+)%/);
  if (discountMatch) {
    discount = parseInt(discountMatch[1]);
    name = name.replace(/-\d+%/, '').trim();
  }

  // Try to parse name and quantity
  const parts = name.split(/\s+/);
  const productName = parts[0];
  const quantity = parts.length > 1 ? parts.slice(1).join(' ') : undefined;

  // Final validation
  if (!productName || productName.length < 2) {
    await ctx.reply('Название продукта слишком короткое. Напиши нормальное название 😊');
    return;
  }

  db.addProduct(userId, productName, quantity, status, discount);

  // Build confirmation message
  const statusEmoji = {
    available: '✅',
    incoming: '📦',
    ordered: '🛒'
  };

  let confirmMsg = `${statusEmoji[status]} Добавлено: ${productName}`;
  if (quantity) confirmMsg += ` (${quantity})`;
  if (discount) confirmMsg += ` 💰 -${discount}%`;

  await ctx.reply(confirmMsg);
}

/**
 * Mark incoming products as arrived (incoming → available)
 */
export async function markProductsArrived(ctx: BotContext, db: DB) {
  const userId = ctx.from!.id;
  const incoming = db.getProductsByStatus(userId, 'incoming');

  if (incoming.length === 0) {
    await ctx.answerCbQuery('Нет продуктов в пути', { show_alert: true });
    return;
  }

  // Update all incoming to available
  for (const product of incoming) {
    db.updateProduct(product.id!, { status: 'available' });
  }

  await ctx.answerCbQuery(`✅ ${incoming.length} продуктов отмечено как приехавшие`);
  await showProducts(ctx, db);
}

/**
 * Mark ordered products as shipped (ordered → incoming)
 */
export async function markProductsShipped(ctx: BotContext, db: DB) {
  const userId = ctx.from!.id;
  const ordered = db.getProductsByStatus(userId, 'ordered');

  if (ordered.length === 0) {
    await ctx.answerCbQuery('Нет заказанных продуктов', { show_alert: true });
    return;
  }

  // Update all ordered to incoming
  for (const product of ordered) {
    db.updateProduct(product.id!, { status: 'incoming' });
  }

  await ctx.answerCbQuery(`📦 ${ordered.length} продуктов отмечено как отправленные`);
  await showProducts(ctx, db);
}

/**
 * Clear all products
 */
export async function clearProducts(ctx: BotContext, db: DB) {
  const userId = ctx.from!.id;
  db.clearUserProducts(userId);

  await ctx.answerCbQuery('Список очищен');
  await ctx.editMessageText('🗑 Список продуктов очищен.');
}
