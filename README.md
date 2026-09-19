# Небо побажань

Приватний сайт-сховище щоденних «доброго ранку» й «добраніч». React-фронт, Fastify-бекенд з файловим сховищем (без БД), Telegram-бот як адмінка.

```
apps/web        Vite + React SPA (мобільний пріоритет)
apps/server     Fastify API + grammY бот в одному процесі
packages/shared типи, дати, формат файлів
scripts/        import-oksana.ts, make-key.ts
deploy/         Docker, Caddy, бекап
design/         еталонні макети (для звірки вигляду)
data/           ← побажання й ключі доступу (поза git!)
```

## Швидкий старт (розробка)

```bash
npm install
cp .env.example .env            # COOKIE_SECRET ≥ 16 символів; PUBLIC_URL=http://localhost:5173
npm run import -- ~/Oksana      # одноразово: 149 файлів → data/wishes/
node --env-file=.env node_modules/.bin/tsx scripts/make-key.ts "dev"   # друкує /unlock?k=… посилання
npm run dev:server              # :3000 (бот стартує лише якщо задано BOT_TOKEN + ADMIN_TELEGRAM_ID)
npm run dev:web                 # :5173, проксі /api і /unlock на :3000
```
Відкрий надруковане посилання — отримаєш cookie й побачиш сайт. `npm test` — усі тести; `npm run build` — типізація + збірка.

## Як працює доступ без логіна

1. Ти в боті: `/link Ксюша` → отримуєш `https://домен/unlock?k=<довгий секрет>`.
2. Вона відкриває посилання раз → сервер перевіряє секрет і ставить підписану `HttpOnly` cookie на рік.
3. Далі сайт відкривається сам, нічого вводити не треба. Без cookie `/api/*` віддає 401, а сайт показує «Це небо — лише для тебе».
4. Втратила телефон / почистила cookie → `/link` ще раз. Старий ключ: `/revoke <id>` (діє миттєво).

У `data/access/keys.json` зберігаються лише SHA-256 хеші. Сайт закритий від пошуковиків (`X-Robots-Tag`, `robots.txt`, `<meta robots>`).

## Бот (лише `ADMIN_TELEGRAM_ID`; усім іншим — тиша)

Надішли боту текст → кнопки **🌙 Ніч / ☀️ Ранок / 📅 Інша дата**. Перезапис існуючого дня — завжди з підтвердженням і показом старого тексту.

| Команда | Що робить |
|---|---|
| `/gn [дата]`, `/gm [дата]` | наступний текст піде як добраніч / добрий ранок на цю дату |
| `/get gn 2026-09-19` | показати; кнопки «Змінити» / «Видалити» |
| `/del gn 2026-09-19` | видалити (з підтвердженням) |
| `/gaps`, `/stats` | пропущені дні; кількості |
| `/link [підпис]`, `/links`, `/revoke id` | ключі доступу |

Дата: `2026-09-19`, `19.09`, `19.09.2026`, `сьогодні`, `вчора`. Для ночі до 05:00 «сьогодні» = попередній день (Київ).

## Деплой (один VPS)

```bash
cp .env.example .env            # BOT_TOKEN, ADMIN_TELEGRAM_ID, COOKIE_SECRET, PUBLIC_URL=https://твій.домен
mkdir -p data && chown 1000:1000 data
# скопіюй свою data/ (або запусти імпорт), DNS домену → на VPS
SITE_ADDRESS=твій.домен docker compose -f deploy/docker-compose.yml up -d --build
```
Caddy сам отримує TLS. Локальна перевірка стеку без домену:
`HOST_UID=$(id -u) HOST_GID=$(id -g) docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.local.yml up -d --build` → http://localhost:8080.

**Бекап:** `deploy/backup.sh` (cron `15 4 * * *`) робить `backups/nebo-YYYY-MM-DD.tar.gz` і тримає 30 останніх. `data/` навмисно не в git — це особисті тексти; за бажання зроби з неї окремий приватний репозиторій.

## Формат даних

`data/wishes/{night|morning}/YYYY-MM-DD.md`:
```markdown
---
date: 2026-08-01
type: night
updatedAt: 2026-09-19T21:30:00.000Z
---
Перший абзац…

Другий абзац…
```
Абзаци — порожній рядок. Час надсилання не зберігається й не показується.

## Мобільна надійність — що зроблено

`viewport-fit=cover` + safe-area; `100dvh` з фолбеком; фон окремим `position: fixed` шаром; свайп на Pointer Events (вертикальний скрол не чіпає, край екрана залишений системному жесту «назад»); шрифти self-hosted (latin + cyrillic); менше анімованих елементів на слабких пристроях; пауза анімацій у фоновій вкладці; `prefers-reduced-motion`; View Transitions з фічедетектом.
