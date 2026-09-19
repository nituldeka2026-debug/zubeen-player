# Zubeen Player

A simple mobile-first Zubeen music-player starter project.

## Included

- Song search/list
- Play / pause UI
- Previous / next
- Favourite
- Queue
- Auto Radio toggle
- Add Online Link UI
- YouTube embedded-player support when an authorised `youtubeId` is supplied
- Admin dashboard demo
- Responsive design

## Run

```bash
npm install
npm run dev
```

Then open the local Vite URL.

## Add a YouTube video

In `src/main.jsx`, set an authorised/embeddable video's ID:

```js
{ id: 1, title: "Example", youtubeId: "VIDEO_ID", ... }
```

Do not download or re-host YouTube audio as MP3. For production, use an approved YouTube player/integration and follow YouTube policies.

## Production architecture

Frontend -> Backend API -> PostgreSQL
                       |
                       +-> YouTube Data API (metadata/discovery)
                       |
                       +-> Admin authentication

Keep API keys and database credentials on the server. Do not put secrets in the frontend.

## Important

This ZIP is an MVP starter, not a finished commercial service. A production release should add:
- secure admin login
- PostgreSQL
- backend API
- YouTube Data API integration with quota-aware caching
- proper PWA manifest/service worker
- analytics/monitoring
- rate limiting
- authorised music/content sources
- backup strategy
