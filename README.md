# Zubeen Radio — Screenshot-style radio player

This version is built around the two reference screenshots:
- cinematic dark/brown radio home screen
- five-part daily schedule screen

## Playback rule
1. If a catalog item has an authorized `audioUrl`, the player uses HTML5 MP3/audio.
2. If there is no MP3 but a YouTube `youtubeId`, the YouTube video is shown and played in the main media card.
3. No YouTube MP3 extraction/downloading is used.

## YouTube API v3
Set this on Render as an environment variable:
`YOUTUBE_API_KEY=your_key`

The Admin page searches public embeddable YouTube videos through the server. Add the selected video to a rotation.

## Render
Build: `npm install && npm run build`
Start: `npm start`

The server stores the catalog in `data/catalog.json`. For a multi-instance/production setup, move this catalog to a database.
