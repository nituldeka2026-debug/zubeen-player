# Zubeen Radio — automatic YouTube/MP3 radio

This build follows the supplied Zubeen Radio screenshots: cinematic home player, five daily rotations, schedule page, live listener counter, and a centered Now Playing card.

## Automatic song selection

No manual song adding is required for normal operation. When a rotation has fewer than 6 playable songs, the Render backend automatically searches YouTube Data API v3 for that rotation, keeps public embeddable/syndicated videos that match Zubeen, and stores them in `data/catalog.json`. The current rotation is synced on first load and whenever the clock enters a new rotation.

The five automatic search groups are:
- Borgeet, Lokgeet & Bhakti
- Bihu & High Energy
- Assamese Modern Classics
- Bollywood Nostalgia
- Midnight Melodies

## Playback

- If a catalog item has an authorized direct MP3 URL, HTML5 audio is used.
- If no MP3 URL exists, the official YouTube IFrame Player is used so the video can be visible inside the radio card.
- The app does not extract or download MP3 from YouTube.
- Browser autoplay policies may require the user to press Play once; after playback starts, the next song is selected automatically.

## Render

Environment variable:
`YOUTUBE_API_KEY=your_youtube_data_api_v3_key`

Build command: `npm install && npm run build`
Start command: `npm start`

The admin page remains available for optional maintenance/manual authorized MP3 entries, but it is not required for the automatic radio flow.
