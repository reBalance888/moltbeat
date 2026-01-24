/**
 * Класс для работы с базой данных SQLite
 */
import Database from 'better-sqlite3';
import { User, Product, Recipe, MealLog, WeightLog, MealType, ProductStatus } from '../types';

export class DB {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initDB();
    this.migrateDB(); // Миграции для обновления схемы
  }

  /**
   * Инициализация таблиц базы данных
   */
  private initDB(): void {
    // Таблица пользователей
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        height INTEGER,
        current_weight REAL,
        target_weight REAL,
        age INTEGER,
        gender TEXT,
        activity_level TEXT,
        goal TEXT,
        daily_calories INTEGER,
        daily_protein INTEGER,
        daily_fats INTEGER,
        daily_carbs INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Таблица продуктов (SMART система)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        quantity TEXT,
        status TEXT DEFAULT 'available',
        discount INTEGER DEFAULT 0,
        expires_at TEXT,
        barcode TEXT,
        calories INTEGER,
        protein INTEGER,
        fats INTEGER,
        carbs INTEGER,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (user_id)
      )
    `);

    // Таблица рецептов
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        cooking_time INTEGER,
        calories INTEGER NOT NULL,
        protein INTEGER NOT NULL,
        fats INTEGER NOT NULL,
        carbs INTEGER NOT NULL,
        ingredients TEXT NOT NULL,
        instructions TEXT NOT NULL,
        image_url TEXT
      )
    `);

    // Таблица приемов пищи
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS meals_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        recipe_id INTEGER,
        recipe_title TEXT NOT NULL,
        meal_type TEXT NOT NULL,
        calories INTEGER NOT NULL,
        protein INTEGER NOT NULL,
        fats INTEGER NOT NULL,
        carbs INTEGER NOT NULL,
        portion_size REAL DEFAULT 1.0,
        logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (user_id)
      )
    `);

    // Таблица взвешиваний
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS weight_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        weight REAL NOT NULL,
        notes TEXT,
        logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (user_id)
      )
    `);

    // Таблица планов меню
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS meal_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        breakfast_recipe_id INTEGER,
        lunch_recipe_id INTEGER,
        dinner_recipe_id INTEGER,
        snack_recipe_id INTEGER,
        total_calories INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (user_id),
        FOREIGN KEY (breakfast_recipe_id) REFERENCES recipes (id),
        FOREIGN KEY (lunch_recipe_id) REFERENCES recipes (id),
        FOREIGN KEY (dinner_recipe_id) REFERENCES recipes (id),
        FOREIGN KEY (snack_recipe_id) REFERENCES recipes (id),
        UNIQUE(user_id, date)
      )
    `);
  }

  /**
   * Миграции базы данных
   */
  private migrateDB(): void {
    // Проверяем какие колонки уже есть
    const columns = this.db.pragma('table_info(products)') as any[];
    const columnNames = columns.map(c => c.name);

    // Добавляем новые колонки если их нет
    const migrations = [
      { name: 'status', sql: 'ALTER TABLE products ADD COLUMN status TEXT DEFAULT "available"' },
      { name: 'discount', sql: 'ALTER TABLE products ADD COLUMN discount INTEGER DEFAULT 0' },
      { name: 'expires_at', sql: 'ALTER TABLE products ADD COLUMN expires_at TEXT' },
      { name: 'barcode', sql: 'ALTER TABLE products ADD COLUMN barcode TEXT' },
      { name: 'calories', sql: 'ALTER TABLE products ADD COLUMN calories INTEGER' },
      { name: 'protein', sql: 'ALTER TABLE products ADD COLUMN protein INTEGER' },
      { name: 'fats', sql: 'ALTER TABLE products ADD COLUMN fats INTEGER' },
      { name: 'carbs', sql: 'ALTER TABLE products ADD COLUMN carbs INTEGER' },
    ];

    for (const migration of migrations) {
      if (!columnNames.includes(migration.name)) {
        try {
          this.db.exec(migration.sql);
          console.log(`✅ Migrated: Added column "${migration.name}" to products table`);
        } catch (error) {
          // Колонка уже существует или другая ошибка
        }
      }
    }
  }

  // ========== ПОЛЬЗОВАТЕЛИ ==========

  getUser(userId: number): User | undefined {
    const stmt = this.db.prepare('SELECT * FROM users WHERE user_id = ?');
    return stmt.get(userId) as User | undefined;
  }

  createUser(userId: number, name: string): User {
    const stmt = this.db.prepare('INSERT INTO users (user_id, name) VALUES (?, ?)');
    stmt.run(userId, name);
    return this.getUser(userId)!;
  }

  updateUser(userId: number, data: Partial<User>): User | undefined {
    const fields = Object.keys(data).map((key) => `${key} = ?`).join(', ');
    const values = Object.values(data);
    values.push(userId);

    const stmt = this.db.prepare(`UPDATE users SET ${fields} WHERE user_id = ?`);
    stmt.run(...values);

    return this.getUser(userId);
  }

  getAllUsers(): User[] {
    const stmt = this.db.prepare('SELECT * FROM users');
    return stmt.all() as User[];
  }

  // ========== ПРОДУКТЫ (SMART система) ==========

  addProduct(
    userId: number,
    name: string,
    quantity?: string,
    status: ProductStatus = 'available',
    discount?: number,
    expiresAt?: string,
    barcode?: string,
    calories?: number,
    protein?: number,
    fats?: number,
    carbs?: number
  ): Product {
    const stmt = this.db.prepare(`
      INSERT INTO products
      (user_id, name, quantity, status, discount, expires_at, barcode, calories, protein, fats, carbs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      userId,
      name,
      quantity || null,
      status,
      discount || 0,
      expiresAt || null,
      barcode || null,
      calories || null,
      protein || null,
      fats || null,
      carbs || null
    );

    const getStmt = this.db.prepare('SELECT * FROM products WHERE id = ?');
    return getStmt.get(result.lastInsertRowid) as Product;
  }

  updateProduct(productId: number, data: Partial<Product>): Product | undefined {
    const fields = Object.keys(data)
      .filter(k => k !== 'id' && k !== 'user_id' && k !== 'added_at')
      .map(k => `${k} = ?`)
      .join(', ');

    const values = Object.keys(data)
      .filter(k => k !== 'id' && k !== 'user_id' && k !== 'added_at')
      .map(k => (data as any)[k]);

    if (fields.length === 0) return undefined;

    values.push(productId);

    const stmt = this.db.prepare(`UPDATE products SET ${fields} WHERE id = ?`);
    stmt.run(...values);

    const getStmt = this.db.prepare('SELECT * FROM products WHERE id = ?');
    return getStmt.get(productId) as Product | undefined;
  }

  getProductsByStatus(userId: number, status: ProductStatus): Product[] {
    const stmt = this.db.prepare(
      'SELECT * FROM products WHERE user_id = ? AND status = ? ORDER BY added_at DESC'
    );
    return stmt.all(userId, status) as Product[];
  }

  getUserProducts(userId: number): Product[] {
    const stmt = this.db.prepare(
      'SELECT * FROM products WHERE user_id = ? ORDER BY added_at DESC'
    );
    return stmt.all(userId) as Product[];
  }

  clearUserProducts(userId: number): void {
    const stmt = this.db.prepare('DELETE FROM products WHERE user_id = ?');
    stmt.run(userId);
  }

  // ========== РЕЦЕПТЫ ==========

  loadRecipesFromJSON(recipes: any[]): number {
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM recipes');
    const existing = countStmt.get() as { count: number };

    if (existing.count > 0) {
      return existing.count;
    }

    const stmt = this.db.prepare(`
      INSERT INTO recipes (title, category, cooking_time, calories, protein, fats, carbs, ingredients, instructions, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let count = 0;
    for (const recipe of recipes) {
      stmt.run(
        recipe.title,
        recipe.category,
        recipe.cooking_time || null,
        recipe.calories,
        recipe.protein,
        recipe.fats,
        recipe.carbs,
        JSON.stringify(recipe.ingredients),
        recipe.instructions,
        recipe.image_url || null
      );
      count++;
    }

    return count;
  }

  getRecipes(category?: string): Recipe[] {
    let query = 'SELECT * FROM recipes';
    const params: any[] = [];

    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }

    query += ' ORDER BY calories ASC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as Recipe[];
  }

  getRecipe(recipeId: number): Recipe | undefined {
    const stmt = this.db.prepare('SELECT * FROM recipes WHERE id = ?');
    return stmt.get(recipeId) as Recipe | undefined;
  }

  /**
   * Add a single recipe (e.g., AI-generated)
   */
  addRecipe(recipe: Omit<Recipe, 'id'>): Recipe {
    const stmt = this.db.prepare(`
      INSERT INTO recipes (title, category, cooking_time, calories, protein, fats, carbs, ingredients, instructions, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      recipe.title,
      recipe.category,
      recipe.cooking_time || null,
      recipe.calories,
      recipe.protein,
      recipe.fats,
      recipe.carbs,
      recipe.ingredients,
      recipe.instructions,
      recipe.image_url || null
    );

    const getStmt = this.db.prepare('SELECT * FROM recipes WHERE id = ?');
    return getStmt.get(result.lastInsertRowid) as Recipe;
  }

  // ========== ПРИЕМЫ ПИЩИ ==========

  logMeal(data: Omit<MealLog, 'id' | 'logged_at'>): MealLog {
    const stmt = this.db.prepare(`
      INSERT INTO meals_log (user_id, recipe_id, recipe_title, meal_type, calories, protein, fats, carbs, portion_size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.user_id,
      data.recipe_id || null,
      data.recipe_title,
      data.meal_type,
      data.calories,
      data.protein,
      data.fats,
      data.carbs,
      data.portion_size
    );

    const getStmt = this.db.prepare('SELECT * FROM meals_log WHERE id = ?');
    return getStmt.get(result.lastInsertRowid) as MealLog;
  }

  getTodayMeals(userId: number): MealLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM meals_log
      WHERE user_id = ? AND DATE(logged_at) = DATE('now')
      ORDER BY logged_at DESC
    `);
    return stmt.all(userId) as MealLog[];
  }

  /**
   * Get recent meals for the last N days
   */
  getRecentMeals(userId: number, days: number): MealLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM meals_log
      WHERE user_id = ? AND DATE(logged_at) >= DATE('now', '-${days} days')
      ORDER BY logged_at DESC
    `);
    return stmt.all(userId) as MealLog[];
  }

  addMealLog(
    userId: number,
    recipeId: number | undefined,
    recipeTitle: string,
    mealType: MealType,
    calories: number,
    protein: number,
    fats: number,
    carbs: number,
    portionSize: number
  ): MealLog {
    return this.logMeal({
      user_id: userId,
      recipe_id: recipeId,
      recipe_title: recipeTitle,
      meal_type: mealType,
      calories,
      protein,
      fats,
      carbs,
      portion_size: portionSize
    });
  }

  // ========== ВЗВЕШИВАНИЯ ==========

  logWeight(userId: number, weight: number, notes?: string): WeightLog {
    const stmt = this.db.prepare(`
      INSERT INTO weight_log (user_id, weight, notes)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(userId, weight, notes || null);

    // Обновляем текущий вес пользователя
    const updateStmt = this.db.prepare(
      'UPDATE users SET current_weight = ? WHERE user_id = ?'
    );
    updateStmt.run(weight, userId);

    const getStmt = this.db.prepare('SELECT * FROM weight_log WHERE id = ?');
    return getStmt.get(result.lastInsertRowid) as WeightLog;
  }

  getWeightHistory(userId: number, limit: number = 30): WeightLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM weight_log
      WHERE user_id = ?
      ORDER BY logged_at DESC
      LIMIT ?
    `);
    return stmt.all(userId, limit) as WeightLog[];
  }

  // ========== ПЛАНЫ МЕНЮ ==========

  saveMealPlan(plan: Omit<any, 'id' | 'created_at'>): any {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO meal_plans
      (user_id, date, breakfast_recipe_id, lunch_recipe_id, dinner_recipe_id, snack_recipe_id, total_calories)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      plan.user_id,
      plan.date,
      plan.breakfast_recipe_id || null,
      plan.lunch_recipe_id || null,
      plan.dinner_recipe_id || null,
      plan.snack_recipe_id || null,
      plan.total_calories
    );

    const getStmt = this.db.prepare('SELECT * FROM meal_plans WHERE id = ?');
    return getStmt.get(result.lastInsertRowid);
  }

  getMealPlanByDate(userId: number, date: string): any | undefined {
    const stmt = this.db.prepare('SELECT * FROM meal_plans WHERE user_id = ? AND date = ?');
    return stmt.get(userId, date);
  }

  getWeeklyMealPlan(userId: number, startDate: string): any[] {
    // Get 7 days starting from startDate
    const stmt = this.db.prepare(`
      SELECT * FROM meal_plans
      WHERE user_id = ?
      AND date >= date(?)
      AND date < date(?, '+7 days')
      ORDER BY date ASC
    `);
    return stmt.all(userId, startDate, startDate);
  }

  deleteMealPlan(userId: number, date: string): void {
    const stmt = this.db.prepare('DELETE FROM meal_plans WHERE user_id = ? AND date = ?');
    stmt.run(userId, date);
  }

  close(): void {
    this.db.close();
  }
}
