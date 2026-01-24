# 🔔 Telegram Уведомления для PPhavchik Bot

## Обзор

Автоматические Telegram уведомления при завершении работы Claude Code с проектом PPhavchik.

---

## 📁 Структура файлов

```
PPhavchik/
├── .claude/
│   ├── settings.local.json           # Настройки хуков Claude Code
│   └── notify-completion.ps1         # Скрипт уведомлений
```

---

## ⚙️ Как работает

### 1. Триггер (Claude Code Hook)

При закрытии сессии Claude Code:
- Claude Code вызывает хук `Stop`
- Хук запускает `notify-completion.ps1`
- Скрипт получает JSON с данными сессии через stdin

### 2. Обработка (notify-completion.ps1)

Скрипт:
1. Читает JSON от Claude Code
2. Логирует данные в `D:\DEV\AI_Workspace\.claude\hook-debug-pphavchik.log`
3. Читает Telegram credentials из `D:\DEV\AI_Workspace\.notify-config`
4. Формирует сообщение: `✅ PPhavchik\n\nJob's done!`
5. Отправляет через Telegram Bot API

### 3. Доставка (Telegram Bot API)

```
POST https://api.telegram.org/bot<TOKEN>/sendMessage
Content-Type: application/json

{
  "chat_id": "753416854",
  "text": "✅ <b>PPhavchik</b>\n\nJob's done!",
  "parse_mode": "HTML"
}
```

---

## 🔧 Конфигурация

### settings.local.json

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "powershell.exe -ExecutionPolicy Bypass -File D:\\DEV\\AI_Workspace\\active\\PPhavchik\\.claude\\notify-completion.ps1"
          }
        ]
      }
    ]
  }
}
```

**Когда срабатывает:**
- При закрытии сессии Claude Code
- При завершении команды `/stop`
- При выходе из проекта

### .notify-config

Глобальный конфиг в `D:\DEV\AI_Workspace\.notify-config`:

```
TELEGRAM_BOT_TOKEN=8530592386:AAHaIPnqOvOLMvtEnrPDU7lLSvUKD_U4NmM
TELEGRAM_CHAT_ID=753416854
```

**Важно:** Этот файл НЕ в Git! (добавлен в `.gitignore`)

---

## 🧪 Тестирование

### Ручной запуск

```bash
# Симуляция Claude Code хука
echo '{"session_id":"test","cwd":"D:\\DEV\\AI_Workspace\\active\\PPhavchik"}' | powershell.exe -ExecutionPolicy Bypass -File "D:\DEV\AI_Workspace\active\PPhavchik\.claude\notify-completion.ps1"
```

**Ожидаемый результат:**
- Уведомление в Telegram: `✅ PPhavchik\n\nJob's done!`
- Лог создан: `D:\DEV\AI_Workspace\.claude\hook-debug-pphavchik.log`
- Ошибок нет (нет файла `hook-error-pphavchik.log`)

### Проверка логов

```bash
# Debug лог (успешные запуски)
cat "D:\DEV\AI_Workspace\.claude\hook-debug-pphavchik.log"

# Error лог (только если были ошибки)
cat "D:\DEV\AI_Workspace\.claude\hook-error-pphavchik.log"
```

---

## 📊 Примеры уведомлений

### Стандартное уведомление

```
✅ PPhavchik

Job's done!
```

### Кастомизация (будущее)

Можно расширить скрипт для отправки деталей:

```
✅ PPhavchik v2.0

Job's done!

📊 SMART функции обновлены
🔧 8 файлов изменено
⏱ Сессия: 45 минут
```

---

## 🔐 Безопасность

### Credentials

- **Bot Token:** Хранится в `.notify-config` (не в Git)
- **Chat ID:** Ваш личный Telegram ID
- **Скрипт:** Локальный, не имеет доступа в интернет кроме Telegram API

### Разрешения Claude Code

Добавлено в глобальный `D:\DEV\AI_Workspace\.claude\settings.local.json`:

```json
"Bash(powershell.exe -ExecutionPolicy Bypass -File \"D:\\\\DEV\\\\AI_Workspace\\\\active\\\\*\\\\.claude\\\\notify-completion.ps1\":*)"
```

Wildcard `*` разрешает все notify скрипты в папках проектов.

---

## 🐛 Устранение проблем

### Уведомление не приходит

**Проверка 1: Хук настроен?**
```bash
cat "D:\DEV\AI_Workspace\active\PPhavchik\.claude\settings.local.json"
```
Должно быть: `"Stop": [...]`

**Проверка 2: Скрипт выполняется?**
```bash
cat "D:\DEV\AI_Workspace\.claude\hook-debug-pphavchik.log"
```
Должен быть JSON от Claude

**Проверка 3: Credentials правильные?**
```bash
cat "D:\DEV\AI_Workspace\.notify-config"
```
Проверь token и chat_id

**Проверка 4: Ошибки?**
```bash
cat "D:\DEV\AI_Workspace\.claude\hook-error-pphavchik.log"
```

### Ошибка "ExecutionPolicy"

Если PowerShell блокирует скрипт:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Ошибка "Telegram API"

Проверь через curl:
```bash
curl "https://api.telegram.org/bot<TOKEN>/getMe"
```

Должен вернуть информацию о боте.

---

## 🔄 Интеграция с другими проектами

Чтобы добавить уведомления в другой проект:

### 1. Создай структуру

```bash
mkdir D:\DEV\AI_Workspace\active\YOUR_PROJECT\.claude
```

### 2. Скопируй файлы

```bash
cp PPhavchik\.claude\settings.local.json YOUR_PROJECT\.claude\
cp PPhavchik\.claude\notify-completion.ps1 YOUR_PROJECT\.claude\
```

### 3. Измени название проекта

В `notify-completion.ps1` замени:
```powershell
$telegramMessage = "$emoji <b>YOUR_PROJECT</b>`n`nJob's done!"
```

---

## 📝 История изменений

### v1.0 (2025-01-22)

- ✅ Создана структура `.claude/` в PPhavchik
- ✅ Настроен хук `Stop` в settings.local.json
- ✅ Реализован `notify-completion.ps1` с прямой отправкой в Telegram
- ✅ Добавлено wildcard разрешение в глобальный settings.local.json
- ✅ Протестирована отправка уведомлений
- ✅ Создана документация

---

## 🎉 Готово!

Теперь при каждом завершении работы с PPhavchik ты будешь получать уведомление в Telegram!

**Job's done!** 🚀
