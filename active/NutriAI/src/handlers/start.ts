/**
 * Start handler - Registration and onboarding
 */
import { Markup } from 'telegraf';
import { BotContext } from '../types';
import { DB } from '../database/db';
import { calculateCalories, calculateMacros } from '../utils/calories';

// Main menu keyboard
const mainMenuKeyboard = Markup.keyboard([
  ['📊 Статистика', '🍽 Рецепты'],
  ['🛒 Продукты', '➕ Добавить прием пищи'],
  ['📅 План меню', '⚖️ Взвеситься'],
  ['🤖 AI Помощник'],
  ['⚙️ Настройки']
]).resize();

/**
 * /start command - Entry point
 */
export async function startCommand(ctx: BotContext, db: DB) {
  const userId = ctx.from!.id;
  const user = db.getUser(userId);

  if (user) {
    // User already registered
    await ctx.reply(
      `С возвращением, ${user.name}! 👋\n\nЧем могу помочь?`,
      mainMenuKeyboard
    );
  } else {
    // New user - start onboarding
    // Get name from Telegram
    const telegramName = ctx.from!.first_name || 'Друг';
    ctx.session = { step: 'height', name: telegramName };

    await ctx.reply(
      `👋 Привет, ${telegramName}! Я бот для правильного питания.\n\n` +
      'Помогу тебе:\n' +
      '✅ Рассчитать калории и БЖУ\n' +
      '✅ Подобрать рецепты\n' +
      '✅ Отслеживать питание\n' +
      '✅ Контролировать вес\n\n' +
      'Какой у тебя рост? (в сантиметрах, например: 170)'
    );
  }
}

/**
 * Handle onboarding flow
 */
export async function handleOnboarding(ctx: BotContext, db: DB) {
  if (!ctx.message || !('text' in ctx.message)) return;

  const step = ctx.session?.step;
  if (!step) return;

  switch (step) {
    case 'height':
      await handleHeightStep(ctx);
      break;
    case 'current_weight':
      await handleCurrentWeightStep(ctx);
      break;
    case 'target_weight':
      await handleTargetWeightStep(ctx);
      break;
    case 'age':
      await handleAgeStep(ctx);
      break;
    case 'gender':
      await handleGenderStep(ctx);
      break;
    case 'activity':
      await handleActivityStep(ctx);
      break;
    case 'goal':
      await handleGoalStep(ctx, db);
      break;
  }
}

async function handleHeightStep(ctx: BotContext) {
  if (!('text' in ctx.message!)) return;
  try {
    const height = parseInt(ctx.message.text.trim());
    if (height < 100 || height > 250) {
      await ctx.reply('❌ Пожалуйста, введи реальный рост (от 100 до 250 см)');
      return;
    }

    ctx.session.height = height;
    ctx.session.step = 'current_weight';

    await ctx.reply(
      'Хорошо! ✅\n\n' +
      'Какой у тебя текущий вес? (в килограммах, например: 75)'
    );
  } catch (error) {
    await ctx.reply('❌ Пожалуйста, введи число (например: 170)');
  }
}

async function handleCurrentWeightStep(ctx: BotContext) {
  if (!('text' in ctx.message!)) return;
  try {
    const weight = parseFloat(ctx.message.text.trim().replace(',', '.'));
    if (weight < 30 || weight > 300) {
      await ctx.reply('❌ Пожалуйста, введи реальный вес (от 30 до 300 кг)');
      return;
    }

    ctx.session.current_weight = weight;
    ctx.session.step = 'target_weight';

    await ctx.reply(
      'Хорошо! ✅\n\n' +
      'Какой вес ты хочешь достичь? (в килограммах, например: 70)'
    );
  } catch (error) {
    await ctx.reply('❌ Пожалуйста, введи число (например: 75)');
  }
}

async function handleTargetWeightStep(ctx: BotContext) {
  if (!('text' in ctx.message!)) return;
  try {
    const weight = parseFloat(ctx.message.text.trim().replace(',', '.'));
    if (weight < 30 || weight > 300) {
      await ctx.reply('❌ Пожалуйста, введи реальный вес (от 30 до 300 кг)');
      return;
    }

    ctx.session.target_weight = weight;
    ctx.session.step = 'age';

    await ctx.reply('Отлично! ✅\n\nСколько тебе лет? (например: 25)');
  } catch (error) {
    await ctx.reply('❌ Пожалуйста, введи число (например: 70)');
  }
}

async function handleAgeStep(ctx: BotContext) {
  if (!('text' in ctx.message!)) return;
  try {
    const age = parseInt(ctx.message.text.trim());
    if (age < 10 || age > 100) {
      await ctx.reply('❌ Пожалуйста, введи реальный возраст (от 10 до 100 лет)');
      return;
    }

    ctx.session.age = age;
    ctx.session.step = 'gender';

    const keyboard = Markup.keyboard([
      ['👨 Мужской', '👩 Женский']
    ]).resize().oneTime();

    await ctx.reply('Хорошо! ✅\n\nУкажи свой пол:', keyboard);
  } catch (error) {
    await ctx.reply('❌ Пожалуйста, введи число (например: 25)');
  }
}

async function handleGenderStep(ctx: BotContext) {
  if (!('text' in ctx.message!)) return;
  const text = ctx.message.text.trim();
  let gender: 'male' | 'female';

  if (text.includes('Мужской') || text.toLowerCase() === 'мужской') {
    gender = 'male';
  } else if (text.includes('Женский') || text.toLowerCase() === 'женский') {
    gender = 'female';
  } else {
    await ctx.reply('❌ Пожалуйста, выбери один из вариантов: Мужской или Женский');
    return;
  }

  ctx.session.gender = gender;
  ctx.session.step = 'activity';

  const keyboard = Markup.keyboard([
    ['🛋 Минимальная'],
    ['🚶 Легкая (1-3 раза в неделю)'],
    ['🏃 Умеренная (3-5 раз в неделю)'],
    ['💪 Интенсивная (6-7 раз в неделю)'],
    ['🔥 Очень интенсивная (каждый день)']
  ]).resize().oneTime();

  await ctx.reply('Отлично! ✅\n\nКакой у тебя уровень активности?', keyboard);
}

async function handleActivityStep(ctx: BotContext) {
  if (!('text' in ctx.message!)) return;
  const text = ctx.message.text.trim();
  let activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

  if (text.includes('Минимальная')) {
    activityLevel = 'sedentary';
  } else if (text.includes('Легкая')) {
    activityLevel = 'light';
  } else if (text.includes('Умеренная')) {
    activityLevel = 'moderate';
  } else if (text.includes('Интенсивная') && !text.includes('Очень')) {
    activityLevel = 'active';
  } else if (text.includes('Очень интенсивная')) {
    activityLevel = 'very_active';
  } else {
    await ctx.reply('❌ Пожалуйста, выбери один из вариантов');
    return;
  }

  ctx.session.activity_level = activityLevel;
  ctx.session.step = 'goal';

  const keyboard = Markup.keyboard([
    ['⬇️ Похудеть'],
    ['⬆️ Набрать массу'],
    ['➡️ Поддерживать вес']
  ]).resize().oneTime();

  await ctx.reply('Супер! ✅\n\nКакая у тебя цель?', keyboard);
}

async function handleGoalStep(ctx: BotContext, db: DB) {
  if (!('text' in ctx.message!)) return;
  const text = ctx.message.text.trim();
  let goal: 'weight_loss' | 'weight_gain' | 'maintain';

  if (text.includes('Похудеть')) {
    goal = 'weight_loss';
  } else if (text.includes('Набрать массу')) {
    goal = 'weight_gain';
  } else if (text.includes('Поддерживать')) {
    goal = 'maintain';
  } else {
    await ctx.reply('❌ Пожалуйста, выбери одну из целей');
    return;
  }

  ctx.session.goal = goal;

  // Calculate calories and macros
  const { name, height, current_weight, target_weight, age, gender, activity_level } = ctx.session;

  if (!name || !height || !current_weight || !target_weight || !age || !gender || !activity_level) {
    await ctx.reply('❌ Ошибка: не все данные заполнены. Начни заново с /start');
    ctx.session = {};
    return;
  }

  const calories = calculateCalories(current_weight, height, age, gender, activity_level, goal);
  const macros = calculateMacros(calories, goal);

  // Save user to database
  const userId = ctx.from!.id;
  db.createUser(userId, name);
  db.updateUser(userId, {
    height,
    current_weight,
    target_weight,
    age,
    gender,
    activity_level,
    goal,
    daily_calories: calories,
    daily_protein: macros.protein,
    daily_fats: macros.fats,
    daily_carbs: macros.carbs
  });

  // Clear session
  ctx.session = {};

  // Show summary
  let goalText = '';
  if (goal === 'weight_loss') {
    goalText = `📉 Цель: Похудеть (${current_weight} → ${target_weight} кг)`;
  } else if (goal === 'weight_gain') {
    goalText = `📈 Цель: Набрать массу (${current_weight} → ${target_weight} кг)`;
  } else {
    goalText = `➡️ Цель: Поддерживать вес (${current_weight} кг)`;
  }

  await ctx.reply(
    `🎉 Отлично! Регистрация завершена!\n\n` +
    `${goalText}\n\n` +
    `📊 Твоя норма:\n` +
    `🔥 Калории: ${calories} ккал/день\n` +
    `💪 Белки: ${macros.protein} г\n` +
    `🥑 Жиры: ${macros.fats} г\n` +
    `🍞 Углеводы: ${macros.carbs} г\n\n` +
    `Теперь ты можешь пользоваться всеми функциями бота! 🚀`,
    mainMenuKeyboard
  );
}

/**
 * /help command
 */
export async function helpCommand(ctx: BotContext) {
  await ctx.reply(
    '📚 <b>Доступные команды:</b>\n\n' +
    '/start - Начать работу с ботом\n' +
    '/help - Показать эту справку\n' +
    '/stats - Показать статистику\n\n' +
    '<b>Или используйте кнопки меню:</b>\n' +
    '📊 Статистика\n' +
    '🍽 Рецепты\n' +
    '🛒 Продукты\n' +
    '➕ Добавить прием пищи\n' +
    '📅 План меню\n' +
    '⚖️ Взвеситься\n' +
    '🤖 AI Помощник\n' +
    '⚙️ Настройки',
    { parse_mode: 'HTML' }
  );
}
