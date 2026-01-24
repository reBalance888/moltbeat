/**
 * AI Assistant handler - Gemini-powered recipe generation and nutritional advice
 */
import { BotContext } from '../types';
import { DB } from '../database/db';
import { AIAssistantService } from '../services/ai-assistant';
import { Markup } from 'telegraf';

const aiService = new AIAssistantService();

/**
 * Show AI assistant main menu
 */
export async function showAIAssistantMenu(ctx: BotContext) {
  let message = '🤖 <b>AI Помощник</b>\n\n';
  message += 'Привет! Я твой личный AI диетолог 🥗\n\n';
  message += '<b>Что я умею:</b>\n';
  message += '👨‍🍳 Создавать рецепты из твоих продуктов\n';
  message += '📊 Анализировать твои привычки питания\n';
  message += '💡 Давать персональные рекомендации\n';
  message += '❓ Отвечать на вопросы о питании\n';
  message += '🛒 Составлять умные списки покупок\n';

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('👨‍🍳 Создать рецепт', 'ai_generate_recipe')],
    [Markup.button.callback('📊 Анализ привычек', 'ai_analyze_habits')],
    [Markup.button.callback('💡 Персональные советы', 'ai_suggestions')],
    [Markup.button.callback('❓ Задать вопрос', 'ai_question')],
    [Markup.button.callback('🛒 Умный список покупок', 'ai_shopping_list')]
  ]);

  await ctx.reply(message, {
    parse_mode: 'HTML',
    ...keyboard
  });
}

/**
 * Start recipe generation flow
 */
export async function startRecipeGeneration(ctx: BotContext, db: DB) {
  const userId = ctx.from!.id;
  const products = db.getUserProducts(userId);
  const availableProducts = products.filter(p => p.status === 'available');

  if (availableProducts.length === 0) {
    await ctx.answerCbQuery();
    await ctx.reply(
      '❌ У тебя нет продуктов в списке!\n\n' +
      'Добавь продукты через меню 🛒 Продукты, ' +
      'и я создам рецепт из того что есть.'
    );
    return;
  }

  await ctx.answerCbQuery();

  // Store context in session
  ctx.session.ai_mode = 'recipe_generation';

  const productList = availableProducts.map(p => p.name).join(', ');

  let message = '👨‍🍳 <b>Генератор рецептов</b>\n\n';
  message += `Доступные продукты:\n${productList}\n\n`;
  message += '💬 Напиши дополнительные пожелания:\n';
  message += 'Например: "хочу что-то быстрое", "без жарки", "на завтрак"\n\n';
  message += 'Или отправь /skip чтобы продолжить без пожеланий.';

  await ctx.reply(message, { parse_mode: 'HTML' });
}

/**
 * Generate recipe from user ingredients
 */
export async function generateRecipe(ctx: BotContext, db: DB, preferences?: string) {
  const userId = ctx.from!.id;
  const user = db.getUser(userId);

  if (!user) {
    await ctx.reply('Ошибка: пользователь не найден');
    return;
  }

  const products = db.getUserProducts(userId);
  const availableProducts = products.filter(p => p.status === 'available');
  const ingredients = availableProducts.map(p => p.name);

  const generatingMsg = await ctx.reply('🤖 Создаю рецепт...\n⏳ Это может занять 5-10 секунд...');

  try {
    const recipe = await aiService.generateRecipeFromIngredients(
      ingredients,
      user,
      preferences
    );

    // Determine category based on calorie content
    let category: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'lunch';
    if (recipe.calories < 300) {
      category = 'snack';
    } else if (recipe.calories < 500) {
      category = 'breakfast';
    } else if (recipe.calories > 700) {
      category = 'dinner';
    }

    // Save recipe to database
    const savedRecipe = db.addRecipe({
      title: recipe.title,
      category: category,
      ingredients: JSON.stringify(recipe.ingredients),
      instructions: recipe.instructions,
      calories: recipe.calories,
      protein: recipe.protein,
      fats: recipe.fats,
      carbs: recipe.carbs,
      cooking_time: recipe.cookingTime
    });

    // Delete generating message
    await ctx.telegram.deleteMessage(ctx.chat!.id, generatingMsg.message_id);

    // Format and send recipe
    let message = '✨ <b>Рецепт готов!</b>\n\n';
    message += `🍽 <b>${recipe.title}</b>\n\n`;
    message += `⏱ Время приготовления: ${recipe.cookingTime} мин\n\n`;

    message += '<b>📝 Ингредиенты:</b>\n';
    recipe.ingredients.forEach((ing: string) => {
      message += `• ${ing}\n`;
    });

    message += `\n<b>👨‍🍳 Инструкция:</b>\n${recipe.instructions}\n\n`;

    message += '<b>🔥 Пищевая ценность:</b>\n';
    message += `Калории: ${recipe.calories} ккал\n`;
    message += `Белки: ${recipe.protein} г | Жиры: ${recipe.fats} г | Углеводы: ${recipe.carbs} г`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🍽 Приготовил! Записать в журнал', `log_meal_${savedRecipe.id}`)],
      [Markup.button.callback('🔄 Создать другой рецепт', 'ai_generate_recipe')]
    ]);

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...keyboard
    });

    // Clear session
    delete ctx.session.ai_mode;
    delete ctx.session.ai_preferences;

  } catch (error) {
    console.error('Error generating recipe:', error);
    await ctx.telegram.deleteMessage(ctx.chat!.id, generatingMsg.message_id);
    await ctx.reply(
      '❌ Не удалось создать рецепт.\n' +
      'Попробуй ещё раз или обратись к администратору.'
    );
    delete ctx.session.ai_mode;
  }
}

/**
 * Analyze eating habits
 */
export async function analyzeEatingHabits(ctx: BotContext, db: DB) {
  const userId = ctx.from!.id;
  const user = db.getUser(userId);

  if (!user) {
    await ctx.answerCbQuery('Пользователь не найден');
    return;
  }

  await ctx.answerCbQuery();

  const recentMeals = db.getRecentMeals(userId, 14); // Last 14 days
  const weightHistory = db.getWeightHistory(userId, 30); // Last 30 days

  if (recentMeals.length < 3) {
    await ctx.reply(
      '📊 <b>Недостаточно данных</b>\n\n' +
      'Для анализа нужно минимум 3 приёма пищи.\n' +
      'Записывай еду через меню ➕ Добавить прием пищи',
      { parse_mode: 'HTML' }
    );
    return;
  }

  const analyzingMsg = await ctx.reply('🤖 Анализирую твои привычки...\n⏳ Это может занять 5-10 секунд...');

  try {
    const analysis = await aiService.analyzeEatingHabits(user, recentMeals, weightHistory);

    await ctx.telegram.deleteMessage(ctx.chat!.id, analyzingMsg.message_id);

    let message = '📊 <b>Анализ твоих привычек питания</b>\n\n';
    message += `<b>Общий анализ:</b>\n${analysis.analysis}\n\n`;

    if (analysis.positives.length > 0) {
      message += '<b>✅ Что делаешь хорошо:</b>\n';
      analysis.positives.forEach(positive => {
        message += `• ${positive}\n`;
      });
      message += '\n';
    }

    if (analysis.recommendations.length > 0) {
      message += '<b>💡 Рекомендации:</b>\n';
      analysis.recommendations.forEach(rec => {
        message += `• ${rec}\n`;
      });
      message += '\n';
    }

    if (analysis.warnings.length > 0) {
      message += '<b>⚠️ На что обратить внимание:</b>\n';
      analysis.warnings.forEach(warning => {
        message += `• ${warning}\n`;
      });
    }

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('💡 Получить советы', 'ai_suggestions')],
      [Markup.button.callback('🔙 Назад в AI меню', 'ai_menu')]
    ]);

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...keyboard
    });

  } catch (error) {
    console.error('Error analyzing habits:', error);
    await ctx.telegram.deleteMessage(ctx.chat!.id, analyzingMsg.message_id);
    await ctx.reply('❌ Не удалось проанализировать данные. Попробуй позже.');
  }
}

/**
 * Get personalized meal suggestions
 */
export async function getPersonalizedSuggestions(ctx: BotContext, db: DB) {
  const userId = ctx.from!.id;
  const user = db.getUser(userId);

  if (!user) {
    await ctx.answerCbQuery('Пользователь не найден');
    return;
  }

  await ctx.answerCbQuery();

  const todayMeals = db.getTodayMeals(userId);
  const products = db.getUserProducts(userId);

  // Calculate remaining calories
  const consumedCalories = todayMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const remainingCalories = (user.daily_calories || 2000) - consumedCalories;

  // Determine time of day
  const hour = new Date().getHours();
  let timeOfDay: 'morning' | 'afternoon' | 'evening';
  if (hour < 12) {
    timeOfDay = 'morning';
  } else if (hour < 18) {
    timeOfDay = 'afternoon';
  } else {
    timeOfDay = 'evening';
  }

  const loadingMsg = await ctx.reply('🤖 Подбираю персональные советы...');

  try {
    const suggestions = await aiService.getPersonalizedSuggestions(
      user,
      products,
      remainingCalories,
      timeOfDay
    );

    await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id);

    const mealTypeRu = timeOfDay === 'morning' ? 'завтрак' : timeOfDay === 'afternoon' ? 'обед' : 'ужин';

    let message = '💡 <b>Персональные рекомендации</b>\n\n';
    message += `⏰ Сейчас время для: ${mealTypeRu}\n`;
    message += `🔥 Осталось калорий: ${Math.max(0, remainingCalories)} ккал\n\n`;
    message += '<b>Я рекомендую:</b>\n';

    suggestions.forEach((suggestion, index) => {
      message += `\n${index + 1}. ${suggestion}`;
    });

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('👨‍🍳 Создать рецепт', 'ai_generate_recipe')],
      [Markup.button.callback('🔙 Назад в AI меню', 'ai_menu')]
    ]);

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...keyboard
    });

  } catch (error) {
    console.error('Error getting suggestions:', error);
    await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id);
    await ctx.reply('❌ Не удалось получить рекомендации. Попробуй позже.');
  }
}

/**
 * Start Q&A mode
 */
export async function startQuestionMode(ctx: BotContext) {
  await ctx.answerCbQuery();

  ctx.session.ai_mode = 'question';

  let message = '❓ <b>Режим вопросов</b>\n\n';
  message += 'Задай мне любой вопрос о правильном питании!\n\n';
  message += '<b>Примеры вопросов:</b>\n';
  message += '• Сколько белка нужно в день?\n';
  message += '• Можно ли есть углеводы вечером?\n';
  message += '• Как считать калории?\n';
  message += '• Что такое дефицит калорий?\n\n';
  message += 'Отправь /cancel чтобы выйти из режима вопросов.';

  await ctx.reply(message, { parse_mode: 'HTML' });
}

/**
 * Answer nutrition question
 */
export async function answerNutritionQuestion(ctx: BotContext, db: DB, question: string) {
  const userId = ctx.from!.id;
  const user = db.getUser(userId);

  const thinkingMsg = await ctx.reply('🤔 Думаю...');

  try {
    const answer = await aiService.answerNutritionQuestion(question, user);

    await ctx.telegram.deleteMessage(ctx.chat!.id, thinkingMsg.message_id);

    let message = '🤖 <b>Ответ AI диетолога:</b>\n\n';
    message += answer;
    message += '\n\n💬 Есть ещё вопросы? Просто напиши!\n';
    message += 'Или отправь /cancel чтобы выйти.';

    await ctx.reply(message, { parse_mode: 'HTML' });

  } catch (error) {
    console.error('Error answering question:', error);
    await ctx.telegram.deleteMessage(ctx.chat!.id, thinkingMsg.message_id);
    await ctx.reply('❌ Не удалось получить ответ. Попробуй переформулировать вопрос.');
  }
}

/**
 * Generate smart shopping list
 */
export async function generateSmartShoppingList(ctx: BotContext, db: DB) {
  const userId = ctx.from!.id;
  const user = db.getUser(userId);

  if (!user) {
    await ctx.answerCbQuery('Пользователь не найден');
    return;
  }

  await ctx.answerCbQuery();

  const existingProducts = db.getUserProducts(userId);

  const generatingMsg = await ctx.reply('🤖 Создаю умный список покупок...\n⏳ Это может занять 5-10 секунд...');

  try {
    const shoppingList = await aiService.generateSmartShoppingList(user, existingProducts, 7);

    await ctx.telegram.deleteMessage(ctx.chat!.id, generatingMsg.message_id);

    let message = '🛒 <b>Умный список покупок (на 7 дней)</b>\n\n';

    if (shoppingList.essentials.length > 0) {
      message += '<b>📦 Базовые продукты:</b>\n';
      shoppingList.essentials.forEach(item => {
        message += `• ${item}\n`;
      });
      message += '\n';
    }

    if (shoppingList.proteins.length > 0) {
      message += '<b>🥩 Белки:</b>\n';
      shoppingList.proteins.forEach(item => {
        message += `• ${item}\n`;
      });
      message += '\n';
    }

    if (shoppingList.vegetables.length > 0) {
      message += '<b>🥗 Овощи и зелень:</b>\n';
      shoppingList.vegetables.forEach(item => {
        message += `• ${item}\n`;
      });
      message += '\n';
    }

    if (shoppingList.carbs.length > 0) {
      message += '<b>🍞 Углеводы:</b>\n';
      shoppingList.carbs.forEach(item => {
        message += `• ${item}\n`;
      });
      message += '\n';
    }

    if (shoppingList.extras.length > 0) {
      message += '<b>➕ Дополнительно:</b>\n';
      shoppingList.extras.forEach(item => {
        message += `• ${item}\n`;
      });
    }

    message += '\n💡 Этот список составлен с учётом твоей цели и того что уже есть дома!';

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Назад в AI меню', 'ai_menu')]
    ]);

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...keyboard
    });

  } catch (error) {
    console.error('Error generating shopping list:', error);
    await ctx.telegram.deleteMessage(ctx.chat!.id, generatingMsg.message_id);
    await ctx.reply('❌ Не удалось создать список покупок. Попробуй позже.');
  }
}

/**
 * Cancel AI mode
 */
export async function cancelAIMode(ctx: BotContext) {
  delete ctx.session.ai_mode;
  delete ctx.session.ai_preferences;

  await ctx.reply(
    '✅ Режим AI помощника завершён.\n\n' +
    'Используй меню чтобы продолжить работу с ботом! 😊'
  );
}
