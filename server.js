const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const API_KEY = process.env.YOUTUBE_API_KEY;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, youtubeConfigured: Boolean(API_KEY) });
});

app.get('/api/youtube/search', async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ error: 'YOUTUBE_API_KEY is not configured on Render.' });
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ items: [] });

    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.search = new URLSearchParams({
      part: 'snippet',
      q,
      type: 'video',
      maxResults: '15',
      key: API_KEY
    });

    const searchResp = await fetch(searchUrl);
    const searchData = await searchResp.json();
    if (!searchResp.ok) return res.status(searchResp.status).json({ error: searchData.error?.message || 'YouTube search failed.' });

    const ids = (searchData.items || []).map(x => x.id?.videoId).filter(Boolean);
    if (!ids.length) return res.json({ items: [] });

    const videoUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    videoUrl.search = new URLSearchParams({
      part: 'status,snippet',
      id: ids.join(','),
      key: API_KEY
    });

    const videoResp = await fetch(videoUrl);
    const videoData = await videoResp.json();
    if (!videoResp.ok) return res.status(videoResp.status).json({ error: videoData.error?.message || 'YouTube video lookup failed.' });

    const allowed = new Set((videoData.items || [])
      .filter(v => v.status?.embeddable !== false && v.status?.privacyStatus === 'public')
      .map(v => v.id));

    const details = new Map((videoData.items || []).map(v => [v.id, v]));
    const items = (searchData.items || [])
      .map(x => {
        const id = x.id?.videoId;
        const d = details.get(id);
        return {
          id,
          title: d?.snippet?.title || x.snippet?.title || '',
          channelTitle: d?.snippet?.channelTitle || x.snippet?.channelTitle || '',
          thumbnail: d?.snippet?.thumbnails?.high?.url || d?.snippet?.thumbnails?.medium?.url || x.snippet?.thumbnails?.high?.url || '',
          embeddable: allowed.has(id)
        };
      })
      .filter(x => x.id && x.embeddable);

    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while searching YouTube.' });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(PORT, () => console.log(`Zubeen Player running on port ${PORT}`));
