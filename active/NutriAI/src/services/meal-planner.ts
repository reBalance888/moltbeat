/**
 * Meal Planner Service - Auto-generate weekly meal plans
 */
import { Recipe, Product, User, DayMealPlan } from '../types';
import { RecipeMatcher } from './recipe-matcher';

export class MealPlannerService {
  /**
   * Generate weekly meal plan
   */
  static generateWeeklyPlan(
    recipes: Recipe[],
    products: Product[],
    user: User,
    startDate: Date
  ): DayMealPlan[] {
    const weeklyPlan: DayMealPlan[] = [];
    const usedRecipes = new Set<number>();

    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + day);

      const dayPlan = this.generateDayPlan(
        recipes,
        products,
        user,
        currentDate,
        usedRecipes
      );

      weeklyPlan.push(dayPlan);
    }

    return weeklyPlan;
  }

  /**
   * Generate meal plan for one day
   */
  private static generateDayPlan(
    recipes: Recipe[],
    products: Product[],
    user: User,
    date: Date,
    usedRecipes: Set<number>
  ): DayMealPlan {
    const dailyCalories = user.daily_calories || 2000;

    // Calorie distribution by meal type
    const breakfastCalories = Math.round(dailyCalories * 0.25); // 25%
    const lunchCalories = Math.round(dailyCalories * 0.35);     // 35%
    const dinnerCalories = Math.round(dailyCalories * 0.30);    // 30%
    const snackCalories = Math.round(dailyCalories * 0.10);     // 10%

    // Select recipes for each meal
    const breakfast = this.selectRecipe(
      recipes,
      'breakfast',
      breakfastCalories,
      products,
      user,
      usedRecipes
    );

    const lunch = this.selectRecipe(
      recipes,
      'lunch',
      lunchCalories,
      products,
      user,
      usedRecipes
    );

    const dinner = this.selectRecipe(
      recipes,
      'dinner',
      dinnerCalories,
      products,
      user,
      usedRecipes
    );

    const snack = this.selectRecipe(
      recipes,
      'snack',
      snackCalories,
      products,
      user,
      usedRecipes
    );

    const totalCalories =
      (breakfast?.calories || 0) +
      (lunch?.calories || 0) +
      (dinner?.calories || 0) +
      (snack?.calories || 0);

    return {
      user_id: user.user_id,
      date: date.toISOString().split('T')[0], // YYYY-MM-DD
      breakfast_recipe_id: breakfast?.id,
      lunch_recipe_id: lunch?.id,
      dinner_recipe_id: dinner?.id,
      snack_recipe_id: snack?.id,
      total_calories: totalCalories
    };
  }

  /**
   * Select best recipe for meal type and calorie target
   */
  private static selectRecipe(
    recipes: Recipe[],
    category: string,
    targetCalories: number,
    products: Product[],
    user: User,
    usedRecipes: Set<number>
  ): Recipe | null {
    // Filter recipes by category
    const categoryRecipes = recipes.filter(r => r.category === category);

    if (categoryRecipes.length === 0) return null;

    // Score each recipe
    const scoredRecipes = categoryRecipes.map(recipe => {
      let score = 100;

      // Skip already used recipes (avoid repetition)
      if (usedRecipes.has(recipe.id!)) {
        score -= 50;
      }

      // Score based on calorie match
      const calorieDiff = Math.abs(recipe.calories - targetCalories);
      const calorieScore = Math.max(0, 50 - (calorieDiff / 10));
      score += calorieScore;

      // Bonus for using available products
      const ingredientsMatch = RecipeMatcher.findMatches(
        [recipe],
        products,
        user,
        [],
        targetCalories
      );

      if (ingredientsMatch.length > 0 && ingredientsMatch[0].canCookNow) {
        score += 30;
      } else if (ingredientsMatch.length > 0 && ingredientsMatch[0].hasDiscountedProducts) {
        score += 20;
      }

      return { recipe, score };
    });

    // Sort by score and pick best
    scoredRecipes.sort((a, b) => b.score - a.score);
    const selected = scoredRecipes[0].recipe;

    // Mark as used
    if (selected.id) {
      usedRecipes.add(selected.id);
    }

    return selected;
  }

  /**
   * Generate shopping list from weekly meal plan
   */
  static generateShoppingList(
    mealPlans: DayMealPlan[],
    recipes: Recipe[],
    existingProducts: Product[]
  ): Map<string, { quantity: number; usedIn: string[] }> {
    const shoppingList = new Map<string, { quantity: number; usedIn: string[] }>();
    const existingProductNames = new Set(
      existingProducts.map(p => p.name.toLowerCase())
    );

    for (const plan of mealPlans) {
      const recipeIds = [
        plan.breakfast_recipe_id,
        plan.lunch_recipe_id,
        plan.dinner_recipe_id,
        plan.snack_recipe_id
      ].filter(id => id !== undefined && id !== null) as number[];

      for (const recipeId of recipeIds) {
        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe) continue;

        const ingredients = JSON.parse(recipe.ingredients) as string[];

        for (const ingredient of ingredients) {
          // Extract ingredient name (remove quantities)
          const ingredientName = ingredient.split(/\d/)[0].trim().toLowerCase();

          // Skip if already have this product
          if (existingProductNames.has(ingredientName)) continue;

          if (!shoppingList.has(ingredientName)) {
            shoppingList.set(ingredientName, {
              quantity: 0,
              usedIn: []
            });
          }

          const item = shoppingList.get(ingredientName)!;
          item.quantity += 1;
          item.usedIn.push(recipe.title);
        }
      }
    }

    return shoppingList;
  }

  /**
   * Get day name in Russian
   */
  static getDayName(date: Date): string {
    const days = [
      'Воскресенье',
      'Понедельник',
      'Вторник',
      'Среда',
      'Четверг',
      'Пятница',
      'Суббота'
    ];
    return days[date.getDay()];
  }
}
