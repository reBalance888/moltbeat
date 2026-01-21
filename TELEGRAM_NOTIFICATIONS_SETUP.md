# 📱 Настройка Telegram уведомлений

## ✅ Текущие настройки

### 1. **Claude CLI уведомления** (глобальные для всех проектов)

📁 Файл: `D:\DEV\AI_Workspace\.notify-config`
📁 Скрипт: `D:\DEV\AI_Workspace\notify.ps1`

```
TELEGRAM_BOT_TOKEN: 8530592386:AAHaIPnqOvOLMvtEnrPDU7lLSvUKD_U4NmM
TELEGRAM_CHAT_ID: 753416854
```

**Кто получает уведомления:**
- ✅ Ты (753416854)

**Когда приходят:**
- ✅ После завершения любой задачи Claude в любом проекте
- ✅ Формат: "✅ **[Название проекта]**\n\nJob's done!" (Warcraft 3 easter egg 🔨)

### 2. **Reminder бот** (ежедневные напоминания)

📁 Проект: `D:\DEV\AI_Workspace\active\reminder`
📁 Файл: `reminder/.env`

```
BOT_TOKEN: 8522007666:AAHWylptVwYwON7TJ-fi1YHYkX8LQM9yybk
ALLOWED_USERS: 753416854,1199841001
```

**Кто имеет доступ:**
- ✅ Ты (753416854)
- ✅ Супруга (1199841001)

**Что делает:**
- Ежедневные напоминания в 10:00, 14:00, 18:00, 21:00
- Вопросы о здоровье, спорте, работе и т.д.
- Сохраняет ответы раздельно для каждого пользователя

### 3. **Проект PPhavchik**

📁 Проект: `D:\DEV\AI_Workspace\active\PPhavchik`

**Текущие уведомления:**
- ✅ Использует общие Claude CLI уведомления (только ты - 753416854)
- ❌ Нет отдельных настроек

**Статус:** Работает через общий механизм уведомлений

---

## 🔧 Как добавить супругу в PPhavchik (если понадобится)

### Вариант 1: Добавить в общие уведомления Claude CLI

Если нужно чтобы супруга получала уведомления от ВСЕХ проектов:

```powershell
# Редактировать файл
D:\DEV\AI_Workspace\.notify-config

# Изменить строку на:
TELEGRAM_CHAT_ID=753416854,1199841001
```

⚠️ **Внимание:** Супруга будет получать уведомления от ВСЕХ проектов в workspace!

### Вариант 2: Отдельные уведомления для PPhavchik (рекомендуется)

Если нужно чтобы супруга получала уведомления ТОЛЬКО от PPhavchik:

#### Шаг 1: Создать папку .claude в PPhavchik

```bash
mkdir "D:\DEV\AI_Workspace\active\PPhavchik\.claude"
```

#### Шаг 2: Создать notify-completion.ps1

Файл: `PPhavchik/.claude/notify-completion.ps1`

```powershell
# Уведомления для PPhavchik (оба пользователя)
$hookInput = [Console]::In.ReadToEnd()

try {
    $data = $hookInput | ConvertFrom-Json -ErrorAction Stop
    $cwd = if ($data.cwd) { $data.cwd } else { "PPhavchik" }
    $projectName = Split-Path -Leaf $cwd

    # CHAT_ID для уведомлений
    $chatIds = @("753416854", "1199841001")

    foreach ($chatId in $chatIds) {
        $notifyScript = "D:\DEV\AI_Workspace\notify.ps1"
        $message = "Задача завершена в PPhavchik!"

        # Временно меняем CHAT_ID в конфиге
        $tempConfig = "D:\DEV\AI_Workspace\.notify-config.temp"
        $originalConfig = Get-Content "D:\DEV\AI_Workspace\.notify-config"

        $originalConfig -replace 'TELEGRAM_CHAT_ID=.*', "TELEGRAM_CHAT_ID=$chatId" |
            Set-Content $tempConfig

        Copy-Item $tempConfig "D:\DEV\AI_Workspace\.notify-config" -Force

        & powershell.exe -ExecutionPolicy Bypass -File $notifyScript `
            -Project "PPhavchik" -Message $message -Type "success"

        Remove-Item $tempConfig -Force
    }

    # Восстанавливаем оригинальный конфиг
    $originalConfig | Set-Content "D:\DEV\AI_Workspace\.notify-config"

    exit 0
}
catch {
    exit 0
}
```

#### Шаг 3: Добавить в settings.json

Файл: `PPhavchik/.claude/settings.json`

```json
{
  "hooks": {
    "user-prompt-submit": "powershell.exe -ExecutionPolicy Bypass -File \"D:\\DEV\\AI_Workspace\\active\\PPhavchik\\.claude\\notify-completion.ps1\""
  }
}
```

---

## 📋 Список всех CHAT_ID

| Пользователь | CHAT_ID | Где добавлен |
|-------------|---------|--------------|
| Ты | 753416854 | ✅ Claude CLI<br>✅ Reminder бот |
| Супруга | 1199841001 | ✅ Reminder бот<br>❌ Claude CLI<br>❌ PPhavchik |

---

## 🚀 Быстрые команды

### Узнать свой CHAT_ID
```
1. Открой Telegram
2. Напиши боту @userinfobot
3. Скопируй свой Id
```

### Проверить reminder бот
```bash
cd D:\DEV\AI_Workspace\active\reminder
cat .env | grep ALLOWED_USERS
```

### Проверить Claude CLI уведомления
```bash
cat D:\DEV\AI_Workspace\.notify-config
```

### Тест уведомления
```powershell
# Отправить тестовое уведомление
powershell.exe -ExecutionPolicy Bypass -File "D:\DEV\AI_Workspace\notify.ps1" `
    -Project "Test" -Message "Проверка уведомлений" -Type "success"
```

---

## 🐛 Troubleshooting

### Уведомления не приходят

1. **Проверить токен бота:**
   ```bash
   cat D:\DEV\AI_Workspace\.notify-config | grep BOT_TOKEN
   ```

2. **Проверить CHAT_ID:**
   ```bash
   cat D:\DEV\AI_Workspace\.notify-config | grep CHAT_ID
   ```

3. **Проверить права PowerShell:**
   ```powershell
   Get-ExecutionPolicy
   # Должно быть: RemoteSigned или Bypass
   ```

4. **Проверить логи:**
   ```bash
   cat D:\DEV\AI_Workspace\.claude\hook-debug.log
   cat D:\DEV\AI_Workspace\.claude\hook-error.log
   ```

### Reminder бот не отвечает

1. **Проверить запущен ли:**
   ```bash
   cd D:\DEV\AI_Workspace\active\reminder
   docker ps | grep reminder
   ```

2. **Перезапустить:**
   ```bash
   cd D:\DEV\AI_Workspace\active\reminder
   docker-compose restart
   ```

3. **Проверить логи:**
   ```bash
   docker-compose logs -f
   ```

---

## 📝 Заметки

- Claude CLI уведомления работают для **всех проектов** автоматически
- Reminder бот работает **независимо** (Docker контейнер)
- PPhavchik пока использует общие уведомления (только ты)
- Если понадобится добавить супругу в PPhavchik - используй **Вариант 2** выше

**Дата создания:** 2026-01-21
**Статус:** ✅ Все настроено и работает
