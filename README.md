# Zubeen Radio Player

A redesigned Zubeen Radio experience based on the two reference screenshots supplied by the project owner: cinematic radio home/player + five-part daily schedule.

## Included
- Zubeen Radio-style home screen
- Now Playing card with cover art
- Official YouTube IFrame Player API playback using video IDs
- Play/pause/next/previous
- Auto-radio and rotation-aware Up Next
- Five-part daily schedule page
- Admin catalog page for adding YouTube video IDs
- Mobile responsive layout
- No YouTube-to-MP3 extraction

## Run
npm install
npm run dev

## Deployment
This remains a Vite app. Keep the existing Render static-site build configuration if that is how the current project is deployed. Build command: `npm run build`. Publish directory: `dist`.

## YouTube
Use only videos that are publicly playable and embeddable. The app does not download or extract audio from YouTube.
