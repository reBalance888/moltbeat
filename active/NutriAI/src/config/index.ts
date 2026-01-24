/**
 * Конфигурация бота для правильного питания
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Config } from '../types';

// Загружаем переменные окружения
dotenv.config();

// Проверяем наличие обязательных переменных
if (!process.env.BOT_TOKEN) {
  throw new Error('BOT_TOKEN не найден в переменных окружения! Создайте файл .env');
}

/**
 * Конфигурация приложения
 */
export const config: Config = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  DATABASE_PATH: process.env.DATABASE_PATH || 'pphavchik.db',
  RECIPES_FILE: path.join(process.cwd(), 'data/recipes.json'),
};

export default config;
