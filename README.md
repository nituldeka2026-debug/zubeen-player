# Zubeen Radio — YouTube Video Radio v3

This version is a real working radio-style web app, not an MP3 extractor.

## What it does
- Official YouTube IFrame Player API for video playback.
- YouTube Data API v3 search from the Admin page.
- Search results are limited to public + embeddable videos.
- Server-side catalog so all visitors use the same song list.
- Five clock-based rotations like the reference design.
- Real active-listener heartbeat counter (server memory; resets on restart).
- Admin page can add/remove YouTube videos from the radio catalog.

## Render
Build command:
`npm install && npm run build`

Start command:
`npm start`

Environment variable:
`YOUTUBE_API_KEY=YOUR_KEY`

Do NOT put the YouTube key in frontend code.

## Important
YouTube Data API provides metadata/video IDs. Playback uses the official embedded YouTube player. This project does not download, extract, or convert YouTube videos into MP3/audio URLs.

The catalog is stored in `data/catalog.json`. On Render, the default filesystem can be ephemeral; use a persistent disk or a database later if you need catalog changes to survive every service restart.
