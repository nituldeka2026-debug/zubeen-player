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


## v12 fixes
- All schedule calculations use Asia/Kolkata (IST), both server and browser.
- Song-end now explicitly advances the shared station and starts the next track automatically.
- Schedule transition triggers catalogue sync for the new programme.
- No-repeat rotation keeps recent songs out of the next pick when alternatives exist.
- Player artwork keeps the Zubeen background visible behind the cover.
- Service-worker/static assets use a bumped cache version and no-cache headers for HTML/JS/CSS.


## Multilingual catalogue discovery
- Program searches now include Assamese, Hindi, Bengali, Nepali and Bodo recordings associated with Zubeen Garg.
- When `YOUTUBE_API_KEY` is configured, each program can discover up to 24 new distinct results per sync attempt, with a six-hour retry interval and a target of 30 tracks per program.
- Discovery is progressive, not an exhaustive guarantee: YouTube search only returns a limited set of public, embeddable results, and some recordings may be unavailable or mislabeled.
- Keep `YOUTUBE_API_KEY` configured in Render for catalogue expansion. Without it, the app can only use the local fallback catalogue and manually added tracks.
