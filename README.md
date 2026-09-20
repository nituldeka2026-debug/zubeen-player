# Zubeen Radio 4.2

A cinematic, synchronized Zubeen Radio web station built on the working 4.x global timeline engine.

## 4.2 changes
- New TUNE IN entry screen inspired by the supplied radio screenshots.
- Prominent live clock, day/date and IST station clock.
- New five-show program system:
  - 00:00–05:00 Prabhat — Zubeen Morning
  - 05:00–09:00 Bihu Beats
  - 09:00–17:00 Zubeen Classics
  - 17:00–22:00 Evening Memories
  - 22:00–00:00 Midnight Zubeen
- Redesigned main live player with album art, Now Playing, live status, current/next show and station actions.
- Recently Played station history endpoint/UI.
- Live progress/time bar fixed and updated continuously from the YouTube IFrame API or synchronized station clock.
- Seeking remains locked so listeners cannot change the global timeline.
- Existing global server-side song synchronization is preserved.
- YouTube Data API v3 automatic discovery remains supported.

## Render
Build Command: `npm install`
Start Command: `node server.js`
Environment variable: `YOUTUBE_API_KEY` (optional; fallback catalogue still works)

Node: 18+


## Background playback

This build supports true mobile background playback when a song has a direct `audioUrl` (MP3/M4A/AAC/OGG/WAV). It uses the native HTML audio element and Media Session API for lock-screen/headset controls. YouTube iframe playback remains subject to mobile browser/YouTube background-playback restrictions. Add direct audio URLs through the admin song form for reliable background playback.
