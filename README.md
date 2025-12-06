# YouTube Channel Analyzer

Сучасна SPA, що використовує YouTube Data API для завантаження відео з будь-якого каналу, вибору до 50 роликів, аналізу метаданих (Cyprus time, перегляди, теги) і експорту CSV. UI працює повністю на фронтенді: локальні закладки, пагінація, bulk-select, скролл-ту-топ.

## Розробка

```bash
npm install    # встановити залежності для скриптів
npm run dev    # http://localhost:3000, обслуговує src/
```

API ключ прописується у `src/config.js` (`YT_API_KEY`). Для тестів можна підставити власний ключ YouTube Data API v3.

## Продакшн-білдів

```bash
npm run build
```

Скрипт `scripts/build.js` скопіює `src/` у `dist/`. Після цього в nginx достатньо вказати `root /path/to/dist;` і сервити як статичний сайт.

## Структура

- `src/` — HTML/CSS/JS вихідники.
- `scripts/dev-server.js` — локальний сервер розробки.
- `scripts/build.js` — копіює статичні файли у `dist/`.
- `dist/` — готові статичні файли для деплою.
