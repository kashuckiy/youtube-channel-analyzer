# YouTube Channel Analyzer

Modern frontend SPA for analyzing any YouTube channel in seconds. The app works directly with the YouTube Data API v3, lets you pick up to 50 videos, surface the key metadata (views, descriptions, hashtags/tags, Cyprus publish time) and export the table to CSV.

## Features

- Accepts `channelId`, `@handle`, `user`, `c/` as well as full URLs and resolves the correct ID automatically.
- Hard limit of 50 videos with bulk-select, progress indicator and safeguards that protect API quotas.
- Video grid with thumbnails, descriptions, view count and a “Load more” button powered by playlistItems pagination.
- Analytics table for the selected videos: hashtags extracted from descriptions, keywords from `snippet.tags`, views, publish date converted to the Cyprus time zone.
- One-click CSV export with normalized column names and sanitized values.
- Local channel bookmarks (favorites) stored in `localStorage`, quick switching and clearing.
- Toast notifications, scroll-to-top button, responsive layout without extra frameworks.

## Before you start

1. Copy the example config and add your API key:
   ```bash
   cp src/config.example.js src/config.js
   ```
2. Drop your YouTube Data API v3 key into `YT_API_KEY`.
3. Adjust `CYPRUS_TIMEZONE` if needed (`Europe/Nicosia` by default) — this zone is used in the table and CSV export.

> **Tip.** Node.js 18+ is recommended (the scripts rely on the built-in `fetch` that ships with 18+).

## Local development

```bash
npm install
npm run dev   # http://localhost:3000 serving files from src/
```

The dev server (`scripts/dev-server.js`) is a tiny HTTP server that skips bundling and serves static files straight from `src/`. Reload the browser tab to see your changes.

## Production build

```bash
npm run build
```

`scripts/build.js` wipes/creates `dist/` and copies `src/` there. Deploy the resulting folder to any static host (nginx, Vercel Static, GitHub Pages, …) — no backend services required.

## Project structure

- `src/index.html`, `src/styles.css`, `src/app.js` — UI, styles and the whole business logic (channel resolution, playlist loading, analysis, CSV).
- `src/config.js` — API key and time-zone configuration (keep real keys out of git, `.gitignore` already covers it).
- `scripts/dev-server.js` — lightweight dev server.
- `scripts/build.js` — copies `src/` to `dist/`.
- `dist/` — build artifacts produced by `npm run build` (ignored in git).

## Typical workflow

1. Paste a channel link (URL, handle, username or raw `channelId`) and press “Load videos”.
2. Add the channel to Favorites to revisit it later (stored locally in the browser).
3. Mark the videos you need (up to 50; “Select all” helps).
4. Hit **Analyze** — the app fetches the metadata, normalizes dates to Cyprus time, and renders the table.
5. Click “Download CSV” to grab a ready-to-use spreadsheet.

Future integrations (Airtable/Sheets import, automated refresh flows, etc.) can build upon this CSV export or extend `app.js`.
