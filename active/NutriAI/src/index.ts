/**
 * Главный файл Telegram бота для правильного питания (TypeScript)
 */
import { Telegraf, session } from 'telegraf';
import * as fs from 'fs';
import config from './config';
import { DB } from './database/db';
import { BotContext, SessionData, MealType, RecipeCategory } from './types';

// Handlers
import { startCommand, handleOnboarding, helpCommand } from './handlers/start';
import { showStats, showWeightChart } from './handlers/stats';
import { showProducts, addProduct, clearProducts, markProductsArrived, markProductsShipped } from './handlers/products';
import { showRecipeCategories, showRecipeDetails, logMealFromRecipe, showSmartRecommendations, showAllRecipesMenu, showRecipesByCategory } from './handlers/recipes';
import { addMeal, showAddMealMenu, startManualMealEntry, handleManualMealEntry } from './handlers/meals';
import { showSettings, logWeight, handleWeightLogging } from './handlers/settings';
import { handleBarcodeScan, consumeScannedProduct, addScannedProduct, cancelBarcodeScan, handlePhotoBarcodeScan } from './handlers/barcode';
import { BarcodeScanner } from './services/barcode-scanner';
import { RemindersService } from './services/reminders';
import { showMealPlanner, generateWeeklyPlan, viewWeeklyPlan, generateShoppingList } from './handlers/meal-planner';
import {
  showAIAssistantMenu,
  startRecipeGeneration,
  generateRecipe,
  analyzeEatingHabits,
  getPersonalizedSuggestions,
  startQuestionMode,
  answerNutritionQuestion,
  generateSmartShoppingList,
  cancelAIMode
} from './handlers/ai-assistant';

// Create bot
const bot = new Telegraf<BotContext>(config.BOT_TOKEN);

// Initialize database
const db = new DB(config.DATABASE_PATH);

// Load recipes
try {
  const recipesData = JSON.parse(fs.readFileSync(config.RECIPES_FILE, 'utf-8'));
  db.loadRecipesFromJSON(recipesData);
} catch (error) {
  console.error('⚠️  Ошибка при загрузке рецептов:', error);
}

// Session middleware
bot.use(session({
  defaultSession: (): SessionData => ({})
}));

// ========== COMMANDS ==========

bot.start((ctx) => startCommand(ctx, db));
bot.help((ctx) => helpCommand(ctx));
bot.command('stats', (ctx) => showStats(ctx, db));

// ========== BUTTON HANDLERS ==========

bot.hears('📊 Статистика', (ctx) => showStats(ctx, db));
bot.hears('🍽 Рецепты', (ctx) => showRecipeCategories(ctx, db));
bot.hears('🛒 Продукты', (ctx) => showProducts(ctx, db));
bot.hears('➕ Добавить прием пищи', (ctx) => showAddMealMenu(ctx, db));
bot.hears('📅 План меню', (ctx) => showMealPlanner(ctx, db));
bot.hears('⚖️ Взвеситься', (ctx) => logWeight(ctx, db));
bot.hears('🤖 AI Помощник', (ctx) => showAIAssistantMenu(ctx));
bot.hears('⚙️ Настройки', (ctx) => showSettings(ctx, db));

// ========== CALLBACK QUERY HANDLERS ==========

// Recipes
bot.action('recipes_smart', (ctx) => {
  showSmartRecommendations(ctx, db);
});

bot.action('recipes_all', (ctx) => {
  showAllRecipesMenu(ctx, db);
});

bot.action('recipes_back', (ctx) => {
  ctx.answerCbQuery();
  showRecipeCategories(ctx, db);
});

bot.action(/^recipes_(breakfast|lunch|dinner|snack)$/, (ctx) => {
  const category = ctx.match[1] as RecipeCategory;
  showRecipesByCategory(ctx, db, category);
});

bot.action(/^recipe_(\d+)$/, (ctx) => {
  const recipeId = parseInt(ctx.match[1]);
  showRecipeDetails(ctx, db, recipeId);
});

bot.action(/^log_meal_(\d+)$/, (ctx) => {
  const recipeId = parseInt(ctx.match[1]);
  logMealFromRecipe(ctx, db, recipeId);
});

// Meal types
bot.action(/^meal_type_(breakfast|lunch|dinner|snack)$/, (ctx) => {
  const mealType = ctx.match[1] as MealType;
  addMeal(ctx, db, mealType);
});

// Add meal options
bot.action('add_meal_recipe', (ctx) => {
  showRecipeCategories(ctx, db);
});

bot.action('add_meal_manual', (ctx) => {
  startManualMealEntry(ctx);
});

// Products
bot.action('products_clear', (ctx) => {
  clearProducts(ctx, db);
});

bot.action('products_arrived', (ctx) => {
  markProductsArrived(ctx, db);
});

bot.action('products_shipped', (ctx) => {
  markProductsShipped(ctx, db);
});

bot.action('goto_products', (ctx) => {
  ctx.answerCbQuery();
  showProducts(ctx, db);
});

// Barcode scanning
bot.action(/^barcode_consume_(.+)$/, (ctx) => {
  const barcode = ctx.match[1];
  consumeScannedProduct(ctx, db, barcode);
});

bot.action(/^barcode_add_(.+)$/, (ctx) => {
  const barcode = ctx.match[1];
  addScannedProduct(ctx, db, barcode);
});

bot.action('barcode_cancel', (ctx) => {
  cancelBarcodeScan(ctx);
});

// Meal planner
bot.action('planner_menu', (ctx) => {
  showMealPlanner(ctx, db);
});

bot.action('planner_generate', (ctx) => {
  generateWeeklyPlan(ctx, db);
});

bot.action('planner_view', (ctx) => {
  viewWeeklyPlan(ctx, db);
});

bot.action('planner_shopping_list', (ctx) => {
  generateShoppingList(ctx, db);
});

// AI Assistant
bot.action('ai_menu', (ctx) => {
  showAIAssistantMenu(ctx);
});

bot.action('ai_generate_recipe', (ctx) => {
  startRecipeGeneration(ctx, db);
});

bot.action('ai_analyze_habits', (ctx) => {
  analyzeEatingHabits(ctx, db);
});

bot.action('ai_suggestions', (ctx) => {
  getPersonalizedSuggestions(ctx, db);
});

bot.action('ai_question', (ctx) => {
  startQuestionMode(ctx);
});

bot.action('ai_shopping_list', (ctx) => {
  generateSmartShoppingList(ctx, db);
});

// Stats and weight chart
bot.action('stats_weight_chart', (ctx) => {
  showWeightChart(ctx, db);
});

bot.action('stats_back', (ctx) => {
  showStats(ctx, db);
});

// ========== TEXT MESSAGE HANDLERS ==========

bot.on('text', (ctx) => {
  const text = ctx.message.text;

  // Check for /skip in recipe generation mode
  if (ctx.session.ai_mode === 'recipe_generation' && text === '/skip') {
    generateRecipe(ctx, db);
    return;
  }

  // Check for /cancel in AI modes
  if (ctx.session.ai_mode && text === '/cancel') {
    cancelAIMode(ctx);
    return;
  }

  // Check if in AI recipe generation mode
  if (ctx.session.ai_mode === 'recipe_generation') {
    ctx.session.ai_preferences = text;
    generateRecipe(ctx, db, text);
    return;
  }

  // Check if in AI question mode
  if (ctx.session.ai_mode === 'question') {
    answerNutritionQuestion(ctx, db, text);
    return;
  }

  // Check if in onboarding flow
  if (ctx.session.step && !ctx.session.step.startsWith('manual_meal_')) {
    handleOnboarding(ctx, db);
    return;
  }

  // Check if in manual meal entry
  if (ctx.session.step && ctx.session.step.startsWith('manual_meal_')) {
    handleManualMealEntry(ctx, db);
    return;
  }

  // Check if logging weight
  if (ctx.session.step === 'log_weight') {
    handleWeightLogging(ctx, db);
    return;
  }

  // Check if user is registered
  const userId = ctx.from.id;
  const user = db.getUser(userId);

  if (!user) {
    ctx.reply('Сначала зарегистрируйтесь с помощью /start');
    return;
  }

  // Check if it's a barcode
  const barcode = BarcodeScanner.parseBarcodeFromText(text);
  if (barcode) {
    handleBarcodeScan(ctx, db, barcode);
    return;
  }

  // Assume it's a product to add
  addProduct(ctx, db, text);
});

// ========== PHOTO HANDLERS ==========

bot.on('photo', (ctx) => {
  handlePhotoBarcodeScan(ctx, db);
});

// ========== ERROR HANDLING ==========

bot.catch((err, ctx) => {
  console.error(`Ошибка для ${ctx.updateType}:`, err);
  ctx.reply('Произошла ошибка. Попробуйте еще раз.');
});

// ========== LAUNCH ==========

bot.launch();
console.log('✅ Бот запущен!');

// Start reminders service
const remindersService = new RemindersService(bot, db);
remindersService.startAllReminders();

// Graceful stop
process.once('SIGINT', () => {
  bot.stop('SIGINT');
  db.close();
});
process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
  db.close();
});
