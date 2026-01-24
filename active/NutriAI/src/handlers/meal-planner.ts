/**
 * Meal Planner Handler - Weekly menu planning
 */
import { Markup } from 'telegraf';
import { BotContext } from '../types';
import { DB } from '../database/db';
import { MealPlannerService } from '../services/meal-planner';

/**
 * Show meal planner menu
 */
export async function showMealPlanner(ctx: BotContext, db: DB) {
  const userId = ctx.from!.id;
  const user = db.getUser(userId);

  if (!user) {
    await ctx.reply('Сначала зарегистрируйся с помощью /start');
    return;
  }

  let message = '📅 <b>Планировщик Меню</b>\n\n';
  message += 'Создай план питания на неделю!\n\n';
  message += '🎯 Учитываются:\n';
  message += '• Твои продукты\n';
  message += '• Дневная норма калорий\n';
  message += '• Разнообразие блюд\n';
  message += '• Скидки 💰\n';

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🎯 Создать план на неделю', 'planner_generate')],
    [Markup.button.callback('📋 Посмотреть текущий план', 'planner_view')],
    [Markup.button.callback('🛒 Список покупок', 'planner_shopping_list')]
  ]);

  await ctx.reply(message, {
    parse_mode: 'HTML',
    ...keyboard
  });
}

/**
 * Generate weekly meal plan
 */
export async function generateWeeklyPlan(ctx: BotContext, db: DB) {
  const userId = ctx.from!.id;
  const user = db.getUser(userId);

  if (!user) {
    await ctx.answerCbQuery('Пользователь не найден');
    return;
  }

  await ctx.answerCbQuery();
  await ctx.editMessageText('🎯 Генерирую план на неделю...\n⏳ Это может занять несколько секунд');

  try {
    // Get all recipes and products
    const recipes = db.getRecipes();
    const products = db.getUserProducts(userId);

    // Generate plan starting from next Monday
    const today = new Date();
    const nextMonday = new Date(today);
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);

    // Generate weekly plan
    const weeklyPlan = MealPlannerService.generateWeeklyPlan(
      recipes,
      products,
      user,
      nextMonday
    );

    // Save to database
    for (const dayPlan of weeklyPlan) {
      db.saveMealPlan(dayPlan);
    }

    // Show success message
    let message = '✅ <b>План создан!</b>\n\n';
    message += `Неделя: ${nextMonday.toLocaleDateString('ru-RU')} - ${new Date(nextMonday.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU')}\n\n`;
    message += '📊 Краткая сводка:\n';

    const totalCalories = weeklyPlan.reduce((sum, plan) => sum + plan.total_calories, 0);
    const avgCalories = Math.round(totalCalories / 7);

    message += `🔥 Средняя калорийность: ${avgCalories} ккал/день\n`;
    message += `🎯 Твоя норма: ${user.daily_calories} ккал/день\n\n`;

    message += '💡 Нажми "Посмотреть план" чтобы увидеть детали';

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📋 Посмотреть план', 'planner_view')],
      [Markup.button.callback('🛒 Список покупок', 'planner_shopping_list')],
      [Markup.button.callback('🔄 Создать заново', 'planner_generate')]
    ]);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      ...keyboard
    });

  } catch (error) {
    console.error('Error generating meal plan:', error);
    await ctx.editMessageText(
      '❌ Ошибка при создании плана. Попробуй ещё раз.',
      Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Попробовать снова', 'planner_generate')]
      ])
    );
  }
}

/**
 * View weekly meal plan
 */
export async function viewWeeklyPlan(ctx: BotContext, db: DB) {
  const userId = ctx.from!.id;

  // Get this week's plan
  const today = new Date();
  const monday = new Date(today);
  const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
  monday.setDate(today.getDate() + daysUntilMonday - 7);
  monday.setHours(0, 0, 0, 0);

  const weeklyPlan = db.getWeeklyMealPlan(userId, monday.toISOString().split('T')[0]);

  if (weeklyPlan.length === 0) {
    await ctx.answerCbQuery('План не найден. Создай новый!', { show_alert: true });
    return;
  }

  await ctx.answerCbQuery();

  let message = '📅 <b>План меню на неделю</b>\n\n';

  for (const dayPlan of weeklyPlan) {
    const date = new Date(dayPlan.date);
    const dayName = MealPlannerService.getDayName(date);

    message += `<b>${dayName} ${date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</b>\n`;

    if (dayPlan.breakfast_recipe_id) {
      const recipe = db.getRecipe(dayPlan.breakfast_recipe_id);
      if (recipe) message += `🌅 ${recipe.title} (${recipe.calories} ккал)\n`;
    }

    if (dayPlan.lunch_recipe_id) {
      const recipe = db.getRecipe(dayPlan.lunch_recipe_id);
      if (recipe) message += `☀️ ${recipe.title} (${recipe.calories} ккал)\n`;
    }

    if (dayPlan.dinner_recipe_id) {
      const recipe = db.getRecipe(dayPlan.dinner_recipe_id);
      if (recipe) message += `🌙 ${recipe.title} (${recipe.calories} ккал)\n`;
    }

    if (dayPlan.snack_recipe_id) {
      const recipe = db.getRecipe(dayPlan.snack_recipe_id);
      if (recipe) message += `🍎 ${recipe.title} (${recipe.calories} ккал)\n`;
    }

    message += `Итого: ${dayPlan.total_calories} ккал\n\n`;
  }

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🛒 Список покупок', 'planner_shopping_list')],
    [Markup.button.callback('🔄 Создать новый', 'planner_generate')]
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    ...keyboard
  });
}

/**
 * Generate shopping list from meal plan
 */
export async function generateShoppingList(ctx: BotContext, db: DB) {
  const userId = ctx.from!.id;

  // Get this week's plan
  const today = new Date();
  const monday = new Date(today);
  const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
  monday.setDate(today.getDate() + daysUntilMonday - 7);
  monday.setHours(0, 0, 0, 0);

  const weeklyPlan = db.getWeeklyMealPlan(userId, monday.toISOString().split('T')[0]);

  if (weeklyPlan.length === 0) {
    await ctx.answerCbQuery('Сначала создай план меню!', { show_alert: true });
    return;
  }

  await ctx.answerCbQuery();

  // Get all recipes
  const recipes = db.getRecipes();
  const existingProducts = db.getUserProducts(userId);

  // Generate shopping list
  const shoppingList = MealPlannerService.generateShoppingList(
    weeklyPlan,
    recipes,
    existingProducts
  );

  let message = '🛒 <b>Список покупок на неделю</b>\n\n';

  if (shoppingList.size === 0) {
    message += 'У тебя уже есть все необходимые продукты! ✅';
  } else {
    message += '<b>Нужно докупить:</b>\n';

    let index = 1;
    for (const [ingredient, data] of shoppingList.entries()) {
      message += `${index}. ${ingredient} (для ${data.usedIn.length} блюд)\n`;
      index++;
    }

    message += '\n💡 Совет: Можешь скопировать список и использовать в магазине!';
  }

  // Show existing products
  const availableProducts = existingProducts.filter(p => p.status === 'available');
  if (availableProducts.length > 0) {
    message += `\n\n✅ <b>Уже есть дома:</b>\n`;
    availableProducts.slice(0, 5).forEach(p => {
      message += `• ${p.name}\n`;
    });
    if (availableProducts.length > 5) {
      message += `...и ещё ${availableProducts.length - 5}\n`;
    }
  }

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📋 Посмотреть план', 'planner_view')],
    [Markup.button.callback('◀️ Назад', 'planner_menu')]
  ]);

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    ...keyboard
  });
}
