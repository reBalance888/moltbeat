/**
 * Recipes handler - Browse and view recipes (with SMART recommendations)
 */
import { Markup } from 'telegraf';
import { BotContext, RecipeCategory } from '../types';
import { DB } from '../database/db';
import { RecipeMatcher } from '../services/recipe-matcher';

const CATEGORY_NAMES: Record<RecipeCategory, string> = {
  breakfast: '🌅 Завтраки',
  lunch: '☀️ Обеды',
  dinner: '🌙 Ужины',
  snack: '🍎 Перекусы',
};

/**
 * Show recipe menu
 */
export async function showRecipeCategories(ctx: BotContext, db?: DB) {
  if (!db) {
    await ctx.reply('Ошибка: база данных недоступна');
    return;
  }

  const userId = ctx.from!.id;
  const products = db.getUserProducts(userId);
  const recipesCount = db.getRecipes().length;

  const message =
    '🍽 <b>Рецепты правильного питания</b>\n\n' +
    `📚 В базе: ${recipesCount} рецептов\n` +
    `🛒 Продуктов у тебя: ${products.length}\n\n` +
    'Выбери что хочешь:';

  const buttons = [];

  // SMART подбор if has products
  if (products.length > 0) {
    buttons.push([Markup.button.callback('🎯 SMART подбор по продуктам', 'recipes_smart')]);
  }

  // All recipes button
  buttons.push([Markup.button.callback('📖 Все рецепты (по категориям)', 'recipes_all')]);

  // AI generation
  buttons.push([Markup.button.callback('🤖 Генерировать рецепт (AI)', 'ai_generate_recipe')]);

  // Add products if empty
  if (products.length === 0) {
    buttons.push([Markup.button.callback('🛒 Добавить продукты', 'goto_products')]);
  }

  await ctx.reply(message, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons),
  });
}

/**
 * Show SMART recipe recommendations based on available products
 */
export async function showSmartRecommendations(ctx: BotContext, db: DB) {
  const userId = ctx.from!.id;
  const user = db.getUser(userId);

  if (!user) {
    await ctx.answerCbQuery('Пользователь не найден');
    return;
  }

  // Get user's products
  const products = db.getUserProducts(userId);
  if (products.length === 0) {
    await ctx.answerCbQuery('Добавь продукты, чтобы получить рекомендации', { show_alert: true });
    return;
  }

  // Get today's meals and calculate remaining calories
  const todayMeals = db.getTodayMeals(userId);
  const consumedCalories = todayMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const remainingCalories = (user.daily_calories || 2000) - consumedCalories;

  // Get all recipes
  const allRecipes = db.getRecipes();

  // Get SMART recommendations
  const recommendations = RecipeMatcher.getTopRecommendations(
    allRecipes,
    products,
    user,
    todayMeals,
    remainingCalories,
    8
  );

  if (recommendations.length === 0) {
    await ctx.answerCbQuery('Не найдено подходящих рецептов', { show_alert: true });
    return;
  }

  // Build message
  let message = '🎯 <b>SMART Рекомендации</b>\n\n';
  message += `Осталось калорий: <b>${remainingCalories} ккал</b>\n`;
  message += `Продуктов в наличии: <b>${products.filter(p => p.status === 'available').length}</b>\n\n`;

  const canCookNow = recommendations.filter(r => r.canCookNow);
  const canCookLater = recommendations.filter(r => !r.canCookNow && r.canCookWhenArrived);

  if (canCookNow.length > 0) {
    message += '✅ <b>Можно готовить сейчас:</b>\n';
    canCookNow.slice(0, 3).forEach(match => {
      message += `• ${match.recipe.title} (${match.recipe.calories} ккал)`;
      if (match.hasDiscountedProducts) message += ' 💰';
      message += '\n';
    });
    message += '\n';
  }

  if (canCookLater.length > 0) {
    message += '📦 <b>Когда приедут продукты:</b>\n';
    canCookLater.slice(0, 3).forEach(match => {
      message += `• ${match.recipe.title} (${match.recipe.calories} ккал)\n`;
    });
  }

  // Create buttons for top recommendations
  const buttons = recommendations.slice(0, 6).map(match =>
    [Markup.button.callback(
      `${match.recipe.title} (${match.recipe.calories} ккал)${match.hasDiscountedProducts ? ' 💰' : ''}`,
      `recipe_${match.recipe.id}`
    )]
  );

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons),
  });

  await ctx.answerCbQuery();
}

/**
 * Show all recipes menu (categories)
 */
export async function showAllRecipesMenu(ctx: BotContext, db: DB) {
  const allRecipes = db.getRecipes();
  const breakfast = db.getRecipes('breakfast');
  const lunch = db.getRecipes('lunch');
  const dinner = db.getRecipes('dinner');
  const snack = db.getRecipes('snack');

  const message =
    '📖 <b>Все рецепты</b>\n\n' +
    `Всего: ${allRecipes.length} рецептов\n\n` +
    `🌅 Завтраки: ${breakfast.length}\n` +
    `☀️ Обеды: ${lunch.length}\n` +
    `🌙 Ужины: ${dinner.length}\n` +
    `🍎 Перекусы: ${snack.length}\n\n` +
    'Выбери категорию:';

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🌅 Завтраки', 'recipes_breakfast')],
      [Markup.button.callback('☀️ Обеды', 'recipes_lunch')],
      [Markup.button.callback('🌙 Ужины', 'recipes_dinner')],
      [Markup.button.callback('🍎 Перекусы', 'recipes_snack')],
      [Markup.button.callback('◀️ Назад', 'recipes_back')],
    ]),
  });

  await ctx.answerCbQuery();
}

/**
 * Show recipes by category
 */
export async function showRecipesByCategory(ctx: BotContext, db: DB, category: RecipeCategory) {
  const recipes = db.getRecipes(category);

  if (recipes.length === 0) {
    await ctx.answerCbQuery('Рецептов не найдено');
    return;
  }

  const buttons = recipes.map((recipe) =>
    [Markup.button.callback(`${recipe.title} (${recipe.calories} ккал)`, `recipe_${recipe.id}`)]
  );

  buttons.push([Markup.button.callback('◀️ Назад к категориям', 'recipes_all')]);

  await ctx.editMessageText(
    `<b>${CATEGORY_NAMES[category]}</b>\n\nНайдено рецептов: ${recipes.length}\nВыбери рецепт:`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons),
    }
  );

  await ctx.answerCbQuery();
}

/**
 * Show recipe details
 */
export async function showRecipeDetails(ctx: BotContext, db: DB, recipeId: number) {
  const recipe = db.getRecipe(recipeId);

  if (!recipe) {
    await ctx.answerCbQuery('Рецепт не найден');
    return;
  }

  const ingredients = JSON.parse(recipe.ingredients) as string[];
  let message = `🍽 <b>${recipe.title}</b>\n\n`;
  message += `⏱ <b>Время:</b> ${recipe.cooking_time} мин\n`;
  message += `🔥 <b>Калории:</b> ${recipe.calories} ккал\n`;
  message += `💪 <b>Б:</b> ${recipe.protein}г | 🥑 <b>Ж:</b> ${recipe.fats}г | 🍞 <b>У:</b> ${recipe.carbs}г\n\n`;
  message += `📝 <b>Ингредиенты:</b>\n`;
  ingredients.forEach((ing: string) => {
    message += `• ${ing}\n`;
  });
  message += `\n👨‍🍳 <b>Приготовление:</b>\n${recipe.instructions}`;

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('➕ Добавить в дневник', `log_meal_${recipe.id}`)],
      [Markup.button.callback('◀️ Назад', `recipes_${recipe.category}`)],
    ]),
  });

  await ctx.answerCbQuery();
}

/**
 * Log meal from recipe
 */
export async function logMealFromRecipe(ctx: BotContext, _db: DB, recipeId: number) {
  const recipe = _db.getRecipe(recipeId);

  if (!recipe) {
    await ctx.answerCbQuery('Рецепт не найден');
    return;
  }

  // Store recipe ID in session for meal type selection
  ctx.session.tempRecipeId = recipeId;

  await ctx.editMessageText(
    `🍽 ${recipe.title}\n\nВыбери тип приема пищи:`,
    Markup.inlineKeyboard([
      [Markup.button.callback('🌅 Завтрак', 'meal_type_breakfast')],
      [Markup.button.callback('☀️ Обед', 'meal_type_lunch')],
      [Markup.button.callback('🌙 Ужин', 'meal_type_dinner')],
      [Markup.button.callback('🍎 Перекус', 'meal_type_snack')],
    ])
  );

  await ctx.answerCbQuery();
}
