/**
 * Stats handler - Show user statistics with weight charts
 */
import { BotContext } from '../types';
import { DB } from '../database/db';
import { WeightChartService } from '../services/weight-chart';
import { Markup } from 'telegraf';

/**
 * Show user stats for today
 */
export async function showStats(ctx: BotContext, db: DB) {
  const userId = ctx.from!.id;
  const user = db.getUser(userId);

  if (!user) {
    await ctx.reply('Сначала зарегистрируйтесь с помощью /start');
    return;
  }

  const todayMeals = db.getTodayMeals(userId);

  // Calculate totals
  const totalCalories = todayMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const totalProtein = todayMeals.reduce((sum, meal) => sum + meal.protein, 0);
  const totalFats = todayMeals.reduce((sum, meal) => sum + meal.fats, 0);
  const totalCarbs = todayMeals.reduce((sum, meal) => sum + meal.carbs, 0);

  let message = `📊 <b>Твоя статистика за сегодня</b>\n\n`;
  message += `👤 <b>Имя:</b> ${user.name}\n`;

  if (user.current_weight && user.target_weight) {
    message += `⚖️ <b>Вес:</b> ${user.current_weight} кг → ${user.target_weight} кг\n`;
  }

  message += `\n🔥 <b>Калории:</b> ${totalCalories} / ${user.daily_calories || 0} ккал\n`;
  message += `💪 <b>Белки:</b> ${totalProtein} / ${user.daily_protein || 0} г\n`;
  message += `🥑 <b>Жиры:</b> ${totalFats} / ${user.daily_fats || 0} г\n`;
  message += `🍞 <b>Углеводы:</b> ${totalCarbs} / ${user.daily_carbs || 0} г\n`;
  message += `\n🍽 <b>Приемов пищи:</b> ${todayMeals.length}`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📈 Динамика веса', 'stats_weight_chart')]
  ]);

  await ctx.reply(message, {
    parse_mode: 'HTML',
    ...keyboard
  });
}

/**
 * Show weight progress chart
 */
export async function showWeightChart(ctx: BotContext, db: DB) {
  const userId = ctx.from!.id;
  const user = db.getUser(userId);

  if (!user) {
    await ctx.answerCbQuery('Пользователь не найден');
    return;
  }

  const weightHistory = db.getWeightHistory(userId, 30);

  if (weightHistory.length === 0) {
    await ctx.answerCbQuery('Нет данных о взвешиваниях', { show_alert: true });
    return;
  }

  await ctx.answerCbQuery();

  let message = '📊 <b>Динамика веса (30 дней)</b>\n\n';

  // Generate ASCII chart
  const chart = WeightChartService.generateWeightChart(weightHistory, user.target_weight || 90);
  message += '<code>' + chart + '</code>\n\n';

  // Calculate trend
  const trend = WeightChartService.calculateTrend(weightHistory);
  const trendText = trend.direction === 'down'
    ? `Тренд: ${trend.emoji} ${Math.abs(trend.change).toFixed(1)} кг за период`
    : trend.direction === 'up'
      ? `Тренд: ${trend.emoji} +${trend.change.toFixed(1)} кг за период`
      : `Тренд: ${trend.emoji} Стабильный вес`;

  message += `<b>${trendText}</b>\n\n`;

  // Calculate ETA
  if (user.target_weight) {
    const eta = WeightChartService.calculateETA(weightHistory, user.target_weight);

    if (eta) {
      message += `🎯 <b>Прогноз до цели:</b>\n`;
      message += `• ${eta.weeks} недель${eta.weeks === 1 ? 'а' : eta.weeks < 5 ? 'и' : ''}\n`;
      message += `• Примерно ${eta.date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long'
      })}\n\n`;
    }

    // Progress bar
    const startWeight = weightHistory[0].weight;
    const currentWeight = weightHistory[weightHistory.length - 1].weight;
    const progressBar = WeightChartService.generateProgressBar(
      currentWeight,
      user.target_weight,
      startWeight
    );

    message += `📈 <b>Прогресс:</b>\n<code>${progressBar}</code>\n`;
    message += `Осталось: <b>${(currentWeight - user.target_weight).toFixed(1)} кг</b>`;
  }

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('◀️ Назад к статистике', 'stats_back')]
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    ...keyboard
  });
}
