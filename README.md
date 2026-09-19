# Zubeen Player — Real YouTube Player

## Render
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment Variable: `YOUTUBE_API_KEY` = your Google Cloud YouTube Data API v3 key

Never put the real API key in GitHub or frontend code.

## How playback works
1. Search calls `/api/youtube/search` on the Render server.
2. The server uses the secret `YOUTUBE_API_KEY` with YouTube Data API v3.
3. Only public, embeddable videos are returned.
4. Clicking Play creates an official YouTube iframe with autoplay.

If a specific video does not allow embedding, it will not be returned by search.
