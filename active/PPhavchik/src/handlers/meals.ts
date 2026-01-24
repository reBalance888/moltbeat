/**
 * Meals handler - Log meals and track nutrition
 */
import { Markup } from 'telegraf';
import { BotContext, MealType } from '../types';
import { DB } from '../database/db';

const MEAL_TYPE_NAMES: Record<MealType, string> = {
  breakfast: '🌅 Завтрак',
  lunch: '☀️ Обед',
  dinner: '🌙 Ужин',
  snack: '🍎 Перекус',
};

/**
 * Add meal to log
 */
export async function addMeal(ctx: BotContext, db: DB, mealType: MealType) {
  const userId = ctx.from!.id;
  const recipeId = ctx.session.tempRecipeId;

  if (!recipeId) {
    await ctx.answerCbQuery('Ошибка: рецепт не выбран');
    return;
  }

  const recipe = db.getRecipe(recipeId);
  if (!recipe) {
    await ctx.answerCbQuery('Рецепт не найден');
    return;
  }

  // Add meal to log with portion size 1.0
  db.addMealLog(
    userId,
    recipeId,
    recipe.title,
    mealType,
    recipe.calories,
    recipe.protein,
    recipe.fats,
    recipe.carbs,
    1.0
  );

  // Clear temp data
  delete ctx.session.tempRecipeId;

  await ctx.editMessageText(
    `✅ Добавлено в ${MEAL_TYPE_NAMES[mealType]}:\n\n` +
    `🍽 ${recipe.title}\n` +
    `🔥 ${recipe.calories} ккал\n` +
    `💪 Б: ${recipe.protein}г | 🥑 Ж: ${recipe.fats}г | 🍞 У: ${recipe.carbs}г`
  );

  await ctx.answerCbQuery('Добавлено в дневник!');
}

/**
 * Show meal selection menu
 */
export async function showAddMealMenu(ctx: BotContext, _db: DB) {
  await ctx.reply(
    '➕ <b>Добавить прием пищи</b>\n\nВыбери способ:',
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🍽 Из рецептов', 'add_meal_recipe')],
        [Markup.button.callback('✍️ Вручную', 'add_meal_manual')],
      ]),
    }
  );
}

/**
 * Start manual meal entry
 */
export async function startManualMealEntry(ctx: BotContext) {
  ctx.session.step = 'manual_meal_name';

  await ctx.editMessageText(
    '✍️ <b>Добавление приема пищи вручную</b>\n\n' +
    'Введи название блюда:',
    { parse_mode: 'HTML' }
  );

  await ctx.answerCbQuery();
}

/**
 * Handle manual meal entry flow
 */
export async function handleManualMealEntry(ctx: BotContext, db: DB) {
  if (!ctx.message || !('text' in ctx.message)) return;
  const text = ctx.message.text;

  const step = ctx.session?.step;
  if (!step || !step.startsWith('manual_meal_')) return;

  switch (step) {
    case 'manual_meal_name':
      ctx.session.tempMealName = text.trim();
      ctx.session.step = 'manual_meal_calories';
      await ctx.reply('Сколько калорий? (например: 350)');
      break;

    case 'manual_meal_calories':
      try {
        const calories = parseInt(text.trim());
        if (calories < 0 || calories > 5000) {
          await ctx.reply('❌ Введи реальное количество калорий (от 0 до 5000)');
          return;
        }
        ctx.session.tempMealCalories = calories;
        ctx.session.step = 'manual_meal_protein';
        await ctx.reply('Сколько белков? (в граммах, например: 25)');
      } catch (error) {
        await ctx.reply('❌ Введи число');
      }
      break;

    case 'manual_meal_protein':
      try {
        const protein = parseInt(text.trim());
        if (protein < 0 || protein > 500) {
          await ctx.reply('❌ Введи реальное количество белков (от 0 до 500 г)');
          return;
        }
        ctx.session.tempMealProtein = protein;
        ctx.session.step = 'manual_meal_fats';
        await ctx.reply('Сколько жиров? (в граммах, например: 15)');
      } catch (error) {
        await ctx.reply('❌ Введи число');
      }
      break;

    case 'manual_meal_fats':
      try {
        const fats = parseInt(text.trim());
        if (fats < 0 || fats > 500) {
          await ctx.reply('❌ Введи реальное количество жиров (от 0 до 500 г)');
          return;
        }
        ctx.session.tempMealFats = fats;
        ctx.session.step = 'manual_meal_carbs';
        await ctx.reply('Сколько углеводов? (в граммах, например: 40)');
      } catch (error) {
        await ctx.reply('❌ Введи число');
      }
      break;

    case 'manual_meal_carbs':
      try {
        const carbs = parseInt(text.trim());
        if (carbs < 0 || carbs > 500) {
          await ctx.reply('❌ Введи реальное количество углеводов (от 0 до 500 г)');
          return;
        }
        ctx.session.tempMealCarbs = carbs;
        ctx.session.step = 'manual_meal_type';

        await ctx.reply(
          'Выбери тип приема пищи:',
          Markup.keyboard([
            ['🌅 Завтрак', '☀️ Обед'],
            ['🌙 Ужин', '🍎 Перекус']
          ]).resize().oneTime()
        );
      } catch (error) {
        await ctx.reply('❌ Введи число');
      }
      break;

    case 'manual_meal_type':
      let mealType: MealType;
      if (text.includes('Завтрак')) {
        mealType = 'breakfast';
      } else if (text.includes('Обед')) {
        mealType = 'lunch';
      } else if (text.includes('Ужин')) {
        mealType = 'dinner';
      } else if (text.includes('Перекус')) {
        mealType = 'snack';
      } else {
        await ctx.reply('❌ Выбери один из вариантов');
        return;
      }

      // Save meal
      const userId = ctx.from!.id;
      const name = ctx.session.tempMealName!;
      const calories = ctx.session.tempMealCalories!;
      const protein = ctx.session.tempMealProtein!;
      const fats = ctx.session.tempMealFats!;
      const carbs = ctx.session.tempMealCarbs!;

      db.addMealLog(userId, undefined, name, mealType, calories, protein, fats, carbs, 1.0);

      // Clear session
      delete ctx.session.step;
      delete ctx.session.tempMealName;
      delete ctx.session.tempMealCalories;
      delete ctx.session.tempMealProtein;
      delete ctx.session.tempMealFats;
      delete ctx.session.tempMealCarbs;

      await ctx.reply(
        `✅ Добавлено в ${MEAL_TYPE_NAMES[mealType]}:\n\n` +
        `🍽 ${name}\n` +
        `🔥 ${calories} ккал\n` +
        `💪 Б: ${protein}г | 🥑 Ж: ${fats}г | 🍞 У: ${carbs}г`,
        Markup.keyboard([
          ['📊 Статистика', '🍽 Рецепты'],
          ['🛒 Продукты', '➕ Добавить прием пищи'],
          ['⚖️ Взвеситься', '⚙️ Настройки']
        ]).resize()
      );
      break;
  }
}
