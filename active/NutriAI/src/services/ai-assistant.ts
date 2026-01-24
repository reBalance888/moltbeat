/**
 * AI Assistant Service - Gemini integration for recipe generation and nutritional advice
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Product, User, MealLog } from '../types';

export class AIAssistantService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  /**
   * Generate recipe from available ingredients
   */
  async generateRecipeFromIngredients(
    ingredients: string[],
    user: User,
    preferences?: string
  ): Promise<{
    title: string;
    ingredients: string[];
    instructions: string;
    calories: number;
    protein: number;
    fats: number;
    carbs: number;
    cookingTime: number;
  }> {
    const prompt = `
Ты - профессиональный диетолог и повар. Создай рецепт здорового блюда.

Доступные ингредиенты: ${ingredients.join(', ')}

Информация о пользователе:
- Цель: ${user.goal === 'weight_loss' ? 'похудение' : user.goal === 'weight_gain' ? 'набор массы' : 'поддержание веса'}
- Дневная норма калорий: ${user.daily_calories} ккал
- Норма белков: ${user.daily_protein} г
- Норма жиров: ${user.daily_fats} г
- Норма углеводов: ${user.daily_carbs} г

${preferences ? `Дополнительные предпочтения: ${preferences}` : ''}

Создай рецепт который:
1. Использует максимум указанных ингредиентов
2. Подходит для цели пользователя
3. Соответствует принципам правильного питания
4. Простой в приготовлении

Ответ дай СТРОГО в формате JSON (без markdown блоков):
{
  "title": "Название блюда",
  "ingredients": ["ингредиент 1", "ингредиент 2", ...],
  "instructions": "Пошаговая инструкция приготовления",
  "calories": число_калорий,
  "protein": граммы_белка,
  "fats": граммы_жиров,
  "carbs": граммы_углеводов,
  "cookingTime": минуты_приготовления
}
`;

    const result = await this.model.generateContent(prompt);
    const response = result.response.text();

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const recipe = JSON.parse(jsonMatch[0]);
    return recipe;
  }

  /**
   * Analyze eating habits and provide recommendations
   */
  async analyzeEatingHabits(
    user: User,
    recentMeals: MealLog[],
    weightHistory: any[]
  ): Promise<{
    analysis: string;
    recommendations: string[];
    warnings: string[];
    positives: string[];
  }> {
    // Calculate averages
    const avgCalories = recentMeals.reduce((sum, meal) => sum + meal.calories, 0) / Math.max(recentMeals.length, 1);
    const avgProtein = recentMeals.reduce((sum, meal) => sum + meal.protein, 0) / Math.max(recentMeals.length, 1);
    const avgFats = recentMeals.reduce((sum, meal) => sum + meal.fats, 0) / Math.max(recentMeals.length, 1);
    const avgCarbs = recentMeals.reduce((sum, meal) => sum + meal.carbs, 0) / Math.max(recentMeals.length, 1);

    // Calculate weight trend
    let weightTrend = 'стабильный';
    if (weightHistory.length >= 2) {
      const change = weightHistory[weightHistory.length - 1].weight - weightHistory[0].weight;
      if (change < -0.5) weightTrend = 'снижается';
      if (change > 0.5) weightTrend = 'увеличивается';
    }

    const prompt = `
Ты - профессиональный диетолог. Проанализируй пищевые привычки пользователя и дай рекомендации.

Информация о пользователе:
- Цель: ${user.goal === 'weight_loss' ? 'похудение' : user.goal === 'weight_gain' ? 'набор массы' : 'поддержание веса'}
- Текущий вес: ${user.current_weight} кг
- Целевой вес: ${user.target_weight} кг
- Норма калорий: ${user.daily_calories} ккал/день

Анализ за последние ${recentMeals.length} приёмов пищи:
- Средняя калорийность: ${Math.round(avgCalories)} ккал/день
- Средний белок: ${Math.round(avgProtein)} г/день
- Средние жиры: ${Math.round(avgFats)} г/день
- Средние углеводы: ${Math.round(avgCarbs)} г/день
- Тренд веса: ${weightTrend}

Дай детальный анализ и рекомендации в формате JSON (без markdown блоков):
{
  "analysis": "Общий анализ ситуации (2-3 предложения)",
  "recommendations": ["рекомендация 1", "рекомендация 2", "рекомендация 3"],
  "warnings": ["предупреждение 1", "предупреждение 2"] или [],
  "positives": ["что делается хорошо 1", "что делается хорошо 2"]
}
`;

    const result = await this.model.generateContent(prompt);
    const response = result.response.text();

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    return JSON.parse(jsonMatch[0]);
  }

  /**
   * Get personalized meal suggestions based on time of day and preferences
   */
  async getPersonalizedSuggestions(
    user: User,
    products: Product[],
    remainingCalories: number,
    timeOfDay: 'morning' | 'afternoon' | 'evening'
  ): Promise<string[]> {
    const mealType = timeOfDay === 'morning' ? 'завтрак' : timeOfDay === 'afternoon' ? 'обед' : 'ужин';
    const availableProducts = products.filter(p => p.status === 'available').map(p => p.name);

    const prompt = `
Ты - AI диетолог. Предложи варианты блюд для пользователя.

Время: ${mealType}
Осталось калорий на сегодня: ${remainingCalories} ккал
Цель пользователя: ${user.goal === 'weight_loss' ? 'похудение' : user.goal === 'weight_gain' ? 'набор массы' : 'поддержание веса'}

Доступные продукты: ${availableProducts.length > 0 ? availableProducts.join(', ') : 'не указаны'}

Предложи 3 варианта блюд для ${mealType}а которые:
1. Вписываются в оставшиеся калории
2. Подходят для цели пользователя
3. Используют доступные продукты (если указаны)
4. Подходят для времени суток

Ответ дай в формате JSON массива строк (без markdown блоков):
["вариант 1", "вариант 2", "вариант 3"]
`;

    const result = await this.model.generateContent(prompt);
    const response = result.response.text();

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    return JSON.parse(jsonMatch[0]);
  }

  /**
   * Answer general nutrition questions
   */
  async answerNutritionQuestion(question: string, user?: User): Promise<string> {
    const userContext = user ? `
Контекст пользователя:
- Цель: ${user.goal === 'weight_loss' ? 'похудение' : user.goal === 'weight_gain' ? 'набор массы' : 'поддержание веса'}
- Норма калорий: ${user.daily_calories} ккал/день
` : '';

    const prompt = `
Ты - профессиональный диетолог и эксперт по правильному питанию.

${userContext}

Вопрос пользователя: ${question}

Дай краткий (максимум 3-4 предложения), понятный и полезный ответ на русском языке.
Используй эмодзи для наглядности. Будь дружелюбным и мотивирующим.
`;

    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }

  /**
   * Generate shopping list based on meal goals
   */
  async generateSmartShoppingList(
    user: User,
    existingProducts: Product[],
    daysCount: number = 7
  ): Promise<{
    essentials: string[];
    proteins: string[];
    vegetables: string[];
    carbs: string[];
    extras: string[];
  }> {
    const existingProductNames = existingProducts.map(p => p.name).join(', ');

    const prompt = `
Ты - эксперт по правильному питанию. Создай список покупок для пользователя.

Цель: ${user.goal === 'weight_loss' ? 'похудение' : user.goal === 'weight_gain' ? 'набор массы' : 'поддержание веса'}
Период: ${daysCount} дней
Уже есть дома: ${existingProductNames || 'ничего'}

Создай список продуктов для правильного питания на ${daysCount} дней в формате JSON (без markdown блоков):
{
  "essentials": ["базовые продукты"],
  "proteins": ["источники белка"],
  "vegetables": ["овощи и зелень"],
  "carbs": ["источники углеводов"],
  "extras": ["дополнительно"]
}

Учитывай что уже есть дома и не дублируй.
`;

    const result = await this.model.generateContent(prompt);
    const response = result.response.text();

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    return JSON.parse(jsonMatch[0]);
  }
}
