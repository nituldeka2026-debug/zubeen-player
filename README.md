# Zubeen Player — Real YouTube Search Backend

This version adds a small Express backend so the YouTube Data API key stays server-side.

## Run locally

```bash
npm install
npm run dev
```

For a production-style local test:

```bash
npm run build
YOUTUBE_API_KEY=your_key npm start
```

## Render

Use a Node service with:

- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Environment Variable:** `YOUTUBE_API_KEY` = your Google Cloud YouTube Data API v3 key

Do not put the key in `src/main.jsx` or any `VITE_*` variable.

## API

`GET /api/health` checks server status without exposing the key.

`GET /api/youtube/search?q=Zubeen%20Garg&maxResults=12` searches YouTube through the backend. The backend requests `type=video` and `videoEmbeddable=true` and returns title, thumbnail, channel and video ID.

The search endpoint uses the YouTube Data API's quota. Search requests consume quota, so production should add caching/rate limiting before heavy traffic.

## Important

`videoEmbeddable=true` means YouTube reports the video as embeddable; it does **not** by itself prove music licensing/permission. Only use videos/content that you are authorised to use. Playback stays inside YouTube's official iframe player.
