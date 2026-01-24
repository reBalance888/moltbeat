/**
 * Version Notification Service
 * Automatically notifies all users when the bot version changes
 */
import * as fs from 'fs';
import * as path from 'path';
import { DB } from '../database/db';

// Paths
const DATA_DIR = path.join(process.cwd(), 'data');
const VERSION_FILE = path.join(DATA_DIR, 'version.json');

// Interfaces
interface VersionInfo {
  lastNotifiedVersion: string;
  lastNotifiedAt?: string;
}

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Get the last notified version
 */
export function getLastNotifiedVersion(): string | null {
  try {
    ensureDataDir();
    if (!fs.existsSync(VERSION_FILE)) {
      return null;
    }
    const data = fs.readFileSync(VERSION_FILE, 'utf-8');
    const versionInfo: VersionInfo = JSON.parse(data);
    return versionInfo.lastNotifiedVersion || null;
  } catch (error) {
    console.error('Error reading version file:', error);
    return null;
  }
}

/**
 * Save the notified version
 */
export function saveNotifiedVersion(version: string): void {
  try {
    ensureDataDir();
    const versionInfo: VersionInfo = {
      lastNotifiedVersion: version,
      lastNotifiedAt: new Date().toISOString()
    };
    fs.writeFileSync(VERSION_FILE, JSON.stringify(versionInfo, null, 2));
  } catch (error) {
    console.error('Error writing version file:', error);
    throw error;
  }
}

/**
 * Get update message for a specific version
 */
function getUpdateMessage(version: string): string | null {
  const updates: { [key: string]: string } = {
    '1.1.0': `🎉 ОБНОВЛЕНИЕ БОТА v1.1.0

Что нового:

✨ НОВЫЕ ФУНКЦИИ
• Автоматические уведомления об обновлениях
• Улучшенная стабильность работы
• Исправление ошибок

Продолжай следить за своим питанием!
/stats - посмотреть статистику`
  };

  return updates[version] || null;
}

/**
 * Check version and send notifications to all users
 */
export async function checkVersionAndNotify(bot: any, db: DB): Promise<void> {
  try {
    // Get current version from package.json
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const currentVersion = packageJson.version;

    // Get last notified version
    const lastNotifiedVersion = getLastNotifiedVersion();

    // If version hasn't changed, do nothing
    if (lastNotifiedVersion === currentVersion) {
      console.log(`📌 Version ${currentVersion} - notifications already sent`);
      return;
    }

    console.log(`🎉 New version detected: ${currentVersion} (was: ${lastNotifiedVersion || 'not set'})`);

    // Get update message for current version
    const updateMessage = getUpdateMessage(currentVersion);

    if (!updateMessage) {
      console.log('⚠️ No update message for this version');
      saveNotifiedVersion(currentVersion);
      return;
    }

    // Get all users from database
    const users = db.getAllUsers();
    let sentCount = 0;

    for (const user of users) {
      try {
        await bot.telegram.sendMessage(user.user_id, updateMessage);
        sentCount++;
        // Delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to send notification to user ${user.user_id}:`, error);
      }
    }

    console.log(`✅ Update notifications sent to ${sentCount} users`);

    // Save notified version
    saveNotifiedVersion(currentVersion);

  } catch (error) {
    console.error('Error checking version:', error);
  }
}
