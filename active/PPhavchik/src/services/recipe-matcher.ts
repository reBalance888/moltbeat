/**
 * SMART Recipe Matcher - Intelligent recipe recommendations
 * Based on available products, discounts, and calorie goals
 */
import { Recipe, Product, User, MealLog } from '../types';

export interface RecipeMatch {
  recipe: Recipe;
  score: number;
  matchedIngredients: string[];
  missingIngredients: string[];
  hasDiscountedProducts: boolean;
  canCookNow: boolean;
  canCookWhenArrived: boolean;
}

export class RecipeMatcher {
  /**
   * Find best recipe matches based on available products
   */
  static findMatches(
    recipes: Recipe[],
    products: Product[],
    user: User,
    todayMeals: MealLog[],
    remainingCalories: number
  ): RecipeMatch[] {
    const matches: RecipeMatch[] = [];

    for (const recipe of recipes) {
      // Skip if recipe exceeds remaining calories
      if (recipe.calories > remainingCalories) {
        continue;
      }

      // Parse recipe ingredients
      const recipeIngredients = this.parseIngredients(recipe.ingredients);

      // Check which ingredients are available
      const matchResult = this.matchIngredients(recipeIngredients, products);

      // Calculate match score
      const score = this.calculateScore(
        matchResult,
        recipe,
        products,
        todayMeals,
        user
      );

      matches.push({
        recipe,
        score,
        matchedIngredients: matchResult.matched,
        missingIngredients: matchResult.missing,
        hasDiscountedProducts: matchResult.hasDiscount,
        canCookNow: matchResult.availableNow,
        canCookWhenArrived: matchResult.availableWhenArrived
      });
    }

    // Sort by score (highest first)
    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Parse ingredients from JSON string
   */
  private static parseIngredients(ingredientsJson: string): string[] {
    try {
      const parsed = JSON.parse(ingredientsJson);
      return parsed.map((ing: any) =>
        typeof ing === 'string' ? ing : ing.name
      ).map((ing: string) => ing.toLowerCase());
    } catch (error) {
      return [];
    }
  }

  /**
   * Match recipe ingredients with available products
   */
  private static matchIngredients(
    recipeIngredients: string[],
    products: Product[]
  ): {
    matched: string[];
    missing: string[];
    hasDiscount: boolean;
    availableNow: boolean;
    availableWhenArrived: boolean;
  } {
    const availableProducts = products.filter(p => p.status === 'available');
    const incomingProducts = products.filter(p => p.status === 'incoming');
    const allFutureProducts = [...availableProducts, ...incomingProducts];

    const matched: string[] = [];
    const missing: string[] = [];
    let hasDiscount = false;

    for (const ingredient of recipeIngredients) {
      const found = products.find(p =>
        this.ingredientMatchesProduct(ingredient, p.name)
      );

      if (found) {
        matched.push(ingredient);
        if (found.discount && found.discount > 0) {
          hasDiscount = true;
        }
      } else {
        missing.push(ingredient);
      }
    }

    const matchRatio = matched.length / recipeIngredients.length;
    const availableNow = availableProducts.length > 0 && matchRatio >= 0.7;
    const availableWhenArrived = allFutureProducts.length > 0 && matchRatio >= 0.7;

    return {
      matched,
      missing,
      hasDiscount,
      availableNow,
      availableWhenArrived
    };
  }

  /**
   * Check if ingredient name matches product name (fuzzy match)
   */
  private static ingredientMatchesProduct(ingredient: string, productName: string): boolean {
    const ingLower = ingredient.toLowerCase();
    const prodLower = productName.toLowerCase();

    // Direct match
    if (ingLower.includes(prodLower) || prodLower.includes(ingLower)) {
      return true;
    }

    // Common synonyms
    const synonyms: Record<string, string[]> = {
      'курица': ['куриная грудка', 'курятина', 'филе курицы'],
      'молоко': ['молоко', 'сливки'],
      'яйцо': ['яйца', 'яйцо'],
      'рис': ['рис', 'рисовая крупа'],
      'гречка': ['гречка', 'гречневая крупа'],
      'помидор': ['помидоры', 'томаты'],
      'огурец': ['огурцы', 'огурец'],
      'картофель': ['картофель', 'картошка'],
      'морковь': ['морковь', 'морковка'],
      'лук': ['лук', 'репчатый лук']
    };

    for (const values of Object.values(synonyms)) {
      if (values.some(v => ingLower.includes(v) || prodLower.includes(v))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate recipe match score
   */
  private static calculateScore(
    matchResult: {
      matched: string[];
      missing: string[];
      hasDiscount: boolean;
      availableNow: boolean;
      availableWhenArrived: boolean;
    },
    recipe: Recipe,
    _products: Product[],
    todayMeals: MealLog[],
    user: User
  ): number {
    let score = 0;

    // Ingredient match ratio (0-50 points)
    const totalIngredients = matchResult.matched.length + matchResult.missing.length;
    const matchRatio = matchResult.matched.length / (totalIngredients || 1);
    score += matchRatio * 50;

    // Bonus for discounted products (10 points)
    if (matchResult.hasDiscount) {
      score += 10;
    }

    // Bonus for can cook now vs later (20 vs 10 points)
    if (matchResult.availableNow) {
      score += 20;
    } else if (matchResult.availableWhenArrived) {
      score += 10;
    }

    // Penalty for recently eaten recipes (avoid repetition)
    const recentlyEaten = todayMeals.some(m => m.recipe_id === recipe.id);
    if (recentlyEaten) {
      score -= 30;
    }

    // Bonus for fitting calorie goals (5-15 points)
    if (user.goal === 'weight_loss') {
      // Prefer lower calorie recipes for weight loss
      if (recipe.calories < 400) score += 15;
      else if (recipe.calories < 600) score += 10;
      else score += 5;
    }

    return score;
  }

  /**
   * Get top N recommendations
   */
  static getTopRecommendations(
    recipes: Recipe[],
    products: Product[],
    user: User,
    todayMeals: MealLog[],
    remainingCalories: number,
    limit: number = 5
  ): RecipeMatch[] {
    const allMatches = this.findMatches(recipes, products, user, todayMeals, remainingCalories);
    return allMatches.slice(0, limit);
  }
}
