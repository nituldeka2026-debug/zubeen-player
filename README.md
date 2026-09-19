# Zubeen Player — Radio + Song Player

This version is an audio-first player. It does **not** use a YouTube video iframe for playback.

## Features
- HTML5 audio playback
- Play / pause / previous / next
- Progress seeking and volume
- Auto Radio: automatically advances when a song ends
- Queue takes priority over the normal song list
- Queue loop through the catalog
- Favorites
- Mobile responsive UI
- No YouTube video screen

## Add real authorised audio
Open `src/main.jsx` and put an authorised direct audio URL in each song's `audioUrl` field:

```js
{ id: 1, title: "Mayabini", artist: "Zubeen Garg", audioUrl: "https://your-domain.example/audio/mayabini.mp3" }
```

The URL must point to audio that the browser can stream (for example MP3/AAC/HLS, depending on your server setup) and that you are authorised to distribute/play.

## Important about YouTube API
YouTube Data API can discover public video metadata, but it does not provide a direct MP3/audio-stream URL. This app therefore does not convert YouTube videos into audio. If YouTube is used for discovery, keep it as metadata and use an approved playback method separately.

## Run
```bash
npm install
npm run dev
```
