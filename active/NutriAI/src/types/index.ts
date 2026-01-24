/**
 * Типы и интерфейсы для бота правильного питания
 */

// Пол пользователя
export type Gender = 'male' | 'female';

// Уровень активности
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

// Цель пользователя
export type Goal = 'weight_loss' | 'weight_gain' | 'maintain';

// Категория рецепта
export type RecipeCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

// Тип приема пищи
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/**
 * Интерфейс пользователя
 */
export interface User {
  user_id: number;
  name: string;
  height?: number;
  current_weight?: number;
  target_weight?: number;
  age?: number;
  gender?: Gender;
  activity_level?: ActivityLevel;
  goal?: Goal;
  daily_calories?: number;
  daily_protein?: number;
  daily_fats?: number;
  daily_carbs?: number;
  created_at?: string;
}

/**
 * Статус продукта
 */
export type ProductStatus = 'available' | 'incoming' | 'ordered';

/**
 * Интерфейс продукта (расширенный для SMART системы)
 */
export interface Product {
  id?: number;
  user_id: number;
  name: string;
  quantity?: string;
  status: ProductStatus; // ✅ Есть дома / 📦 Едет / 🛒 Заказан
  discount?: number; // 💰 Скидка в процентах
  expires_at?: string; // 📅 Срок годности
  barcode?: string; // Штрих-код для сканера
  calories?: number; // КБЖУ для автоподсчёта
  protein?: number;
  fats?: number;
  carbs?: number;
  added_at?: string;
}

/**
 * Интерфейс рецепта
 */
export interface Recipe {
  id?: number;
  title: string;
  category: RecipeCategory;
  cooking_time?: number;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  ingredients: string; // JSON string
  instructions: string;
  image_url?: string;
}

/**
 * Интерфейс записи о приеме пищи
 */
export interface MealLog {
  id?: number;
  user_id: number;
  recipe_id?: number;
  recipe_title: string;
  meal_type: MealType;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  portion_size: number;
  logged_at?: string;
}

/**
 * Интерфейс записи взвешивания
 */
export interface WeightLog {
  id?: number;
  user_id: number;
  weight: number;
  notes?: string;
  logged_at?: string;
}

/**
 * Интерфейс для расчета макронутриентов
 */
export interface Macros {
  protein: number;
  fats: number;
  carbs: number;
}

/**
 * Интерфейс конфигурации
 */
export interface Config {
  BOT_TOKEN: string;
  DATABASE_PATH: string;
  RECIPES_FILE: string;
}

/**
 * Коэффициенты активности
 */
export const ACTIVITY_COEFFICIENTS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Дефицит и профицит калорий
 */
export const CALORIE_DEFICIT = 350; // Было 500 - слишком жёстко, 350 комфортнее
export const CALORIE_SURPLUS = 300;

/**
 * Соотношение БЖУ по целям
 */
export interface MacroRatios {
  protein: number;
  fats: number;
  carbs: number;
}

export const MACRO_RATIOS: Record<Goal, MacroRatios> = {
  weight_loss: {
    protein: 0.30,
    fats: 0.25,
    carbs: 0.45,
  },
  weight_gain: {
    protein: 0.25,
    fats: 0.25,
    carbs: 0.50,
  },
  maintain: {
    protein: 0.25,
    fats: 0.30,
    carbs: 0.45,
  },
};

/**
 * Калорийность макронутриентов (ккал на грамм)
 */
export const CALORIES_PER_GRAM = {
  protein: 4,
  fats: 9,
  carbs: 4,
};

/**
 * Session data for conversation state
 */
export interface SessionData {
  // Onboarding data
  name?: string;
  height?: number;
  current_weight?: number;
  target_weight?: number;
  age?: number;
  gender?: Gender;
  activity_level?: ActivityLevel;
  goal?: Goal;

  // Current conversation state
  step?: string;

  // Temporary data
  tempRecipeId?: number;
  tempMealType?: MealType;

  // Manual meal entry data
  tempMealName?: string;
  tempMealCalories?: number;
  tempMealProtein?: number;
  tempMealFats?: number;
  tempMealCarbs?: number;

  // Barcode scanning data
  tempBarcodeProduct?: {
    name: string;
    barcode: string;
    calories: number;
    protein: number;
    fats: number;
    carbs: number;
    quantity?: string;
    brand?: string;
    imageUrl?: string;
  };

  // AI Assistant modes
  ai_mode?: 'recipe_generation' | 'question';
  ai_preferences?: string;
}

/**
 * Meal plan for a day
 */
export interface DayMealPlan {
  id?: number;
  user_id: number;
  date: string; // YYYY-MM-DD
  breakfast_recipe_id?: number;
  lunch_recipe_id?: number;
  dinner_recipe_id?: number;
  snack_recipe_id?: number;
  total_calories: number;
  created_at?: string;
}

/**
 * Weekly meal plan
 */
export interface WeeklyMealPlan {
  monday: DayMealPlan;
  tuesday: DayMealPlan;
  wednesday: DayMealPlan;
  thursday: DayMealPlan;
  friday: DayMealPlan;
  saturday: DayMealPlan;
  sunday: DayMealPlan;
}

/**
 * Shopping list generated from meal plan
 */
export interface ShoppingListItem {
  ingredient: string;
  quantity: string;
  usedInRecipes: string[]; // Recipe titles
}

/**
 * Bot context with session
 */
import { Context } from 'telegraf';

export interface BotContext extends Context {
  session: SessionData;
}
