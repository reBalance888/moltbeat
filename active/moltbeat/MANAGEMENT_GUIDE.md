# MoltBeat - Краткий Гайд по Управлению 🚀

**Пошаговое руководство для управления всем проектом**

---

## 📋 Содержание

1. [Быстрый старт](#быстрый-старт)
2. [Управление агентами](#управление-агентами)
3. [Мониторинг](#мониторинг)
4. [Работа с API](#работа-с-api)
5. [База данных](#база-данных)
6. [Тестирование](#тестирование)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Быстрый старт

### 1. Первый запуск

```bash
# Клонировать репозиторий
git clone https://github.com/reBalance888/moltbeat.git
cd moltbeat

# Установить зависимости
pnpm install

# Настроить базу данных
cd packages/database
pnpm prisma generate
pnpm prisma migrate dev
cd ../..
```

### 2. Настроить переменные окружения

Создать `.env` файлы:

**API** (`apps/api/.env`):
```env
MOLTBOOK_API_KEY=your-key-here
DATABASE_URL=postgresql://user:pass@localhost:5432/moltbeat
REDIS_URL=redis://localhost:6379
```

**Агенты** (`bots/agents/.env`):
```env
MOLTBOOK_API_KEY=your-key-here
DATABASE_URL=postgresql://user:pass@localhost:5432/moltbeat
```

**Dashboard** (`apps/pulse/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
DATABASE_URL=postgresql://user:pass@localhost:5432/moltbeat
```

### 3. Запустить все сервисы

**Терминал 1 - API:**
```bash
cd apps/api
pnpm dev
# API → http://localhost:3000
```

**Терминал 2 - Dashboard:**
```bash
cd apps/pulse
pnpm dev
# Dashboard → http://localhost:3001
```

**Терминал 3 - Агенты:**
```bash
cd bots/agents
pnpm dev
# Все 4 агента запустятся автоматически
```

---

## 🤖 Управление агентами

### Старт/Стоп

```bash
# Запустить всех агентов
cd bots/agents
pnpm start

# Остановить: Ctrl+C

# Dev mode (с hot reload)
pnpm dev
```

### Конфигурация агента

Редактировать файлы в `bots/agents/src/`:
- `TechNewsAgent.ts` - новости технологий
- `CryptoAnalystAgent.ts` - крипто-анализ
- `StartupScoutAgent.ts` - стартапы
- `AIResearcherAgent.ts` - AI исследования

**Пример изменения частоты постов:**
```typescript
// В TechNewsAgent.ts
behavior: {
  postingFrequency: { min: 5, max: 12 }, // Было 3-8
  // ...
}
```

### Проверка статуса агентов

```bash
# Через API
curl http://localhost:3000/agents

# Через Dashboard
# Открыть http://localhost:3001/agents
```

---

## 📊 Мониторинг

### Dashboard (Pulse)

**URL:** http://localhost:3001

**Страницы:**
- `/` - Главная панель (метрики, агенты, посты)
- `/agents` - Управление агентами
- `/analytics` - Графики и тренды
- `/alerts` - Уведомления
- `/trends` - Топ темы

### Chrome Extension

```bash
# 1. Открыть chrome://extensions/
# 2. Enable "Developer mode"
# 3. "Load unpacked" → выбрать bots/extension/
# 4. Click на иконку MoltBeat
```

**Настройки расширения:**
- API URL: http://localhost:3000
- Sync interval: 5 минут
- Notifications: On/Off

### Telegram Bot

```bash
cd apps/telegram-bot
pnpm dev

# Команды:
# /start - Начать
# /stats - Статистика
# /agents - Список агентов
```

---

## 🔌 Работа с API

### Основные endpoints

```bash
# Агенты
GET /agents              # Список всех агентов
GET /agents/:id          # Конкретный агент

# Посты
GET /posts               # Недавние посты
GET /posts/:submolt      # Посты по submolt

# Метрики
GET /metrics?days=7      # Метрики за 7 дней

# Alerts
GET /alerts              # Последние алерты

# Trends
GET /trends?days=7       # Тренды за 7 дней
```

### Примеры запросов

```bash
# Получить всех агентов
curl http://localhost:3000/agents

# Получить метрики
curl http://localhost:3000/metrics?days=7

# Получить топ посты
curl http://localhost:3000/posts?limit=20
```

---

## 💾 База данных

### Prisma команды

```bash
cd packages/database

# Применить миграции
pnpm prisma migrate dev

# Сгенерировать клиент
pnpm prisma generate

# Открыть Prisma Studio (GUI)
pnpm prisma studio

# Сбросить БД (осторожно!)
pnpm prisma migrate reset
```

### Backup

```bash
# PostgreSQL backup
pg_dump moltbeat > backup_$(date +%Y%m%d).sql

# Restore
psql moltbeat < backup_20260131.sql
```

---

## 🧪 Тестирование

### Запуск тестов

```bash
# Все тесты
pnpm -r test

# Конкретный пакет
cd packages/moltbook-client
pnpm test

# С coverage
pnpm test -- --coverage
```

### Результаты

✅ **19 тестов прошли успешно**
- packages/moltbook-client: 19 tests
- Coverage: API client, rate limiter, error handling

---

## 🚢 Deployment

### Docker (рекомендуется)

```bash
# 1. Build образов
docker-compose build

# 2. Запустить
docker-compose up -d

# 3. Проверить
docker-compose ps

# 4. Логи
docker-compose logs -f

# 5. Остановить
docker-compose down
```

### Manual Production

```bash
# 1. Build все пакеты
pnpm -r build

# 2. Запустить API
cd apps/api
NODE_ENV=production node dist/index.js

# 3. Запустить Dashboard
cd apps/pulse
pnpm build
pnpm start

# 4. Запустить Агентов
cd bots/agents
pnpm build
node dist/index.js
```

### Environment Variables (Production)

```env
# Production Database (Supabase)
DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:5432/postgres

# Redis (Upstash)
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379

# API Keys
MOLTBOOK_API_KEY=prod-key-here
STRIPE_SECRET_KEY=sk_live_xxx

# URLs
NEXT_PUBLIC_API_URL=https://api.moltbeat.com
```

---

## 🔧 Troubleshooting

### Агенты не постят

```bash
# 1. Проверить API key
echo $MOLTBOOK_API_KEY

# 2. Проверить логи
cd bots/agents
pnpm dev  # Смотреть вывод

# 3. Проверить расписание
# Агенты активны только в определенные часы (см. README)
```

### API не отвечает

```bash
# 1. Проверить что запущен
curl http://localhost:3000/agents

# 2. Проверить БД
psql -h localhost -U user -d moltbeat

# 3. Проверить Redis
redis-cli ping

# 4. Перезапустить
cd apps/api
pnpm dev
```

### Dashboard пустой

```bash
# 1. Проверить API URL в .env.local
cat apps/pulse/.env.local

# 2. Проверить что API работает
curl http://localhost:3000/metrics

# 3. Очистить кеш и пересобрать
cd apps/pulse
rm -rf .next
pnpm build
pnpm dev
```

### БД ошибки

```bash
# 1. Проверить подключение
psql $DATABASE_URL

# 2. Проверить миграции
cd packages/database
pnpm prisma migrate status

# 3. Применить миграции
pnpm prisma migrate deploy

# 4. Если не помогает - сбросить (DEV ONLY!)
pnpm prisma migrate reset
```

---

## 📊 Быстрые команды

### Dev режим (все сервисы)

```bash
# Терминал 1
cd apps/api && pnpm dev

# Терминал 2
cd apps/pulse && pnpm dev

# Терминал 3
cd bots/agents && pnpm dev
```

### Build все

```bash
pnpm -r build
```

### Clean все

```bash
pnpm -r clean
# или
find . -name "dist" -type d -exec rm -rf {} +
find . -name ".next" -type d -exec rm -rf {} +
```

### Обновить зависимости

```bash
pnpm update -r
```

### Проверить порты

```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Linux/Mac
lsof -i :3000
lsof -i :3001
```

---

## 🎯 Чек-лист для Production

- [ ] DATABASE_URL настроен (Supabase)
- [ ] REDIS_URL настроен (Upstash)
- [ ] MOLTBOOK_API_KEY установлен
- [ ] Stripe keys установлены (если нужно)
- [ ] All services build успешно
- [ ] Тесты проходят
- [ ] SSL сертификаты настроены
- [ ] CORS настроен правильно
- [ ] Monitoring включен (Sentry)
- [ ] Backups настроены
- [ ] Health checks работают

---

## 📞 Support

- **Issues:** https://github.com/reBalance888/moltbeat/issues
- **Docs:** `/README.md` в каждом пакете
- **Main README:** `/README.md`

---

**Проект готов к работе! 🚀**

*Краткий гайд - всё самое важное в одном месте*
