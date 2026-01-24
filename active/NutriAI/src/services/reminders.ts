/**
 * Reminders Service - Smart notifications for expiring products and weight tracking
 */
import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { DB } from '../database/db';
import { BotContext } from '../types';

export class RemindersService {
  private bot: Telegraf<BotContext>;
  private db: DB;

  constructor(bot: Telegraf<BotContext>, db: DB) {
    this.bot = bot;
    this.db = db;
  }

  /**
   * Start all reminder jobs
   */
  startAllReminders() {
    // Check expiring products every day at 09:00
    cron.schedule('0 9 * * *', () => {
      this.checkExpiringProducts();
    });

    console.log('✅ Reminders service started');
  }

  /**
   * Check for products expiring soon and notify users
   */
  private async checkExpiringProducts() {
    try {
      const users = this.db.getAllUsers();

      for (const user of users) {
        const products = this.db.getUserProducts(user.user_id);
        const expiringProducts = products.filter(product => {
          if (!product.expires_at) return false;

          const expiryDate = new Date(product.expires_at);
          const today = new Date();
          const daysUntilExpiry = Math.ceil(
            (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Notify if expires in 3 days or less
          return daysUntilExpiry > 0 && daysUntilExpiry <= 3;
        });

        if (expiringProducts.length > 0) {
          await this.sendExpiryNotification(user.user_id, expiringProducts);
        }
      }
    } catch (error) {
      console.error('Error checking expiring products:', error);
    }
  }

  /**
   * Send notification about expiring products
   */
  private async sendExpiryNotification(userId: number, products: any[]) {
    try {
      let message = '⚠️ <b>Внимание! Продукты истекают</b>\n\n';

      for (const product of products) {
        const expiryDate = new Date(product.expires_at);
        const today = new Date();
        const daysLeft = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        const dateStr = expiryDate.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit'
        });

        if (daysLeft === 1) {
          message += `⚠️ <b>${product.name}</b> истекает завтра! (${dateStr})\n`;
        } else {
          message += `📅 <b>${product.name}</b> истекает через ${daysLeft} дня (${dateStr})\n`;
        }
      }

      message += '\n💡 Успей использовать!';

      await this.bot.telegram.sendMessage(userId, message, {
        parse_mode: 'HTML'
      });
    } catch (error) {
      console.error(`Error sending expiry notification to user ${userId}:`, error);
    }
  }

  /**
   * Check if user needs weekly weigh-in reminder
   */
  async checkWeeklyWeighIn(userId: number): Promise<boolean> {
    const weightHistory = this.db.getWeightHistory(userId, 1);

    if (weightHistory.length === 0) {
      return true; // Never weighed
    }

    const lastWeight = weightHistory[0];
    const lastWeighDate = new Date(lastWeight.logged_at!);
    const today = new Date();
    const daysSinceLastWeigh = Math.floor(
      (today.getTime() - lastWeighDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceLastWeigh >= 7;
  }

  /**
   * Send weekly weigh-in reminder
   */
  async sendWeighInReminder(userId: number) {
    try {
      const user = this.db.getUser(userId);
      if (!user) return;

      const weightHistory = this.db.getWeightHistory(userId, 1);
      const lastWeight = weightHistory.length > 0 ? weightHistory[0].weight : null;

      let message = '⚖️ <b>Время взвешиваться!</b>\n\n';
      message += 'Прошло 7 дней с последнего взвешивания.\n\n';

      if (lastWeight) {
        message += `Текущий вес в системе: <b>${lastWeight} кг</b>\n`;
        message += `Целевой вес: <b>${user.target_weight} кг</b>\n\n`;
      }

      message += 'Нажми ⚖️ Взвеситься чтобы обновить данные';

      await this.bot.telegram.sendMessage(userId, message, {
        parse_mode: 'HTML'
      });
    } catch (error) {
      console.error(`Error sending weigh-in reminder to user ${userId}:`, error);
    }
  }

  /**
   * Manual trigger for testing expiry notifications
   */
  async triggerExpiryCheck() {
    await this.checkExpiringProducts();
  }
}
