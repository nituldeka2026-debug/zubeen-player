import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 10000;
const API_KEY = process.env.YOUTUBE_API_KEY;

app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, youtubeConfigured: Boolean(API_KEY) });
});

app.get('/api/youtube/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const requestedMax = Number(req.query.maxResults || 10);
  const maxResults = Math.min(Math.max(Number.isFinite(requestedMax) ? requestedMax : 10, 1), 25);

  if (!q) return res.status(400).json({ error: 'Search query is required.' });
  if (!API_KEY) return res.status(503).json({ error: 'YouTube API is not configured on the server.' });

  const params = new URLSearchParams({
    part: 'snippet',
    q,
    type: 'video',
    videoEmbeddable: 'true',
    maxResults: String(maxResults),
    key: API_KEY
  });

  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const data = await response.json();

    if (!response.ok) {
      const reason = data?.error?.errors?.[0]?.reason || 'YouTube API request failed.';
      return res.status(response.status).json({ error: reason });
    }

    const songs = (data.items || []).map((item) => ({
      id: `yt-${item.id.videoId}`,
      title: item.snippet?.title || 'Untitled',
      album: 'YouTube',
      year: item.snippet?.publishedAt ? item.snippet.publishedAt.slice(0, 4) : '—',
      youtubeId: item.id.videoId,
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
      channelTitle: item.snippet?.channelTitle || '',
      description: item.snippet?.description || ''
    }));

    res.set('Cache-Control', 'public, max-age=60');
    res.json({ query: q, songs });
  } catch (error) {
    console.error('YouTube search error:', error);
    res.status(502).json({ error: 'Could not reach YouTube right now.' });
  }
});

const dist = path.join(__dirname, 'dist');
app.use(express.static(dist));
app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')));

app.listen(PORT, () => {
  console.log(`Zubeen Player server running on port ${PORT}`);
});
