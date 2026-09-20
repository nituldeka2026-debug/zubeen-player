# Zubeen Radio 3.0 — Render ready

## Why the old ZIP did not play
The previous build could start with an empty catalog (`youtubeId: ""`). The UI then showed the player, but there was no actual playable media queued. It also depended on the YouTube Data API before it had a guaranteed fallback.

## What this version changes
- No Vite/build step. Render can run `node server.js` directly.
- The player uses the official YouTube IFrame Player API.
- Three real Zubeen Garg Official Artist Channel videos are seeded as playable fallbacks.
- A first user click on Play starts the YouTube video (browser autoplay restrictions are respected).
- If a video returns a YouTube playback error, the radio automatically moves to the next song.
- If `YOUTUBE_API_KEY` is set on Render, the server automatically searches embeddable Zubeen Garg videos and adds them to the current rotation.
- Listener heartbeat is included.
- Schedule and Admin pages are included.

## Render settings
Build Command: leave empty.
Start Command: `node server.js`
Environment Variable: `YOUTUBE_API_KEY` = your YouTube Data API v3 key.

After deploy, open the site and press the round Play button once. The video will then play inside the radio player.


## 4.0 Global Live Radio
- Song selection is locked for listeners. Next/Previous and track clicks cannot change the station.
- The server owns the station clock and song timeline.
- Every listener syncs to the server timeline using server timestamps.
- YouTube duration is reported to the server when available so song changes happen automatically for everyone.
- Listeners may press Listen to join the live stream, but cannot pause/seek/change the station timeline.
