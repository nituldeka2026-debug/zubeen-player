const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 10000;
const API_KEY = process.env.YOUTUBE_API_KEY || '';
const DATA_DIR = path.join(__dirname, 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');

app.use(express.json({ limit: '1mb' }));

const DEFAULT_CATALOG = [
  { id: 'seed-1', title: 'Phoolate Bohagare', artist: 'Zubeen Garg', year: '2022', category: 'Bihu & High Energy', youtubeId: '', thumbnail: '', enabled: true },
  { id: 'seed-2', title: 'Mayabini', artist: 'Zubeen Garg', year: '—', category: 'Assamese Modern Classics', youtubeId: '', thumbnail: '', enabled: true },
  { id: 'seed-3', title: 'Monole Ubhoti Ahe', artist: 'Zubeen Garg', year: '—', category: 'Assamese Modern Classics', youtubeId: '', thumbnail: '', enabled: true }
];

function ensureCatalogFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CATALOG_FILE)) fs.writeFileSync(CATALOG_FILE, JSON.stringify(DEFAULT_CATALOG, null, 2));
}
function readCatalog() {
  try {
    ensureCatalogFile();
    return JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8')) || [];
  } catch (e) {
    console.error('Catalog read failed:', e);
    return DEFAULT_CATALOG;
  }
}
function writeCatalog(items) {
  ensureCatalogFile();
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(items, null, 2));
}
function cleanText(v, max = 300) { return String(v || '').trim().slice(0, max); }

// Active browser sessions. A session is considered live for 45 seconds after its last heartbeat.
const listeners = new Map();
const LISTENER_TTL = 45_000;
function pruneListeners() {
  const now = Date.now();
  for (const [id, ts] of listeners) if (now - ts > LISTENER_TTL) listeners.delete(id);
}
setInterval(pruneListeners, 15_000).unref();

app.get('/api/health', (req, res) => {
  res.json({ ok: true, youtubeConfigured: Boolean(API_KEY), catalogCount: readCatalog().length, listeners: listeners.size });
});

app.get('/api/songs', (req, res) => {
  const category = cleanText(req.query.category, 100);
  const all = readCatalog().filter(s => s.enabled !== false && s.youtubeId);
  res.json({ items: category ? all.filter(s => s.category === category) : all });
});

app.post('/api/listeners/heartbeat', (req, res) => {
  pruneListeners();
  let sessionId = cleanText(req.body?.sessionId, 120);
  if (!sessionId) sessionId = crypto.randomUUID();
  listeners.set(sessionId, Date.now());
  res.json({ sessionId, listeners: listeners.size });
});

app.get('/api/listeners', (req, res) => {
  pruneListeners();
  res.json({ listeners: listeners.size });
});

app.get('/api/youtube/search', async (req, res) => {
  try {
    if (!API_KEY) return res.status(503).json({ error: 'YOUTUBE_API_KEY is not configured on Render.' });
    const q = cleanText(req.query.q, 180);
    if (!q) return res.json({ items: [] });

    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.search = new URLSearchParams({
      part: 'snippet', q, type: 'video', maxResults: '20', regionCode: 'IN', videoEmbeddable: 'true', key: API_KEY
    });
    const searchResp = await fetch(searchUrl);
    const searchData = await searchResp.json();
    if (!searchResp.ok) return res.status(searchResp.status).json({ error: searchData.error?.message || 'YouTube search failed.' });

    const ids = (searchData.items || []).map(x => x.id?.videoId).filter(Boolean);
    if (!ids.length) return res.json({ items: [] });

    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.search = new URLSearchParams({ part: 'snippet,status,contentDetails', id: ids.join(','), key: API_KEY });
    const detailsResp = await fetch(detailsUrl);
    const detailsData = await detailsResp.json();
    if (!detailsResp.ok) return res.status(detailsResp.status).json({ error: detailsData.error?.message || 'YouTube details failed.' });

    const items = (detailsData.items || [])
      .filter(v => v.status?.privacyStatus === 'public' && v.status?.embeddable !== false)
      .map(v => ({
        id: v.id,
        title: v.snippet?.title || '',
        channelTitle: v.snippet?.channelTitle || '',
        thumbnail: v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url || '',
        publishedAt: v.snippet?.publishedAt || '',
        duration: v.contentDetails?.duration || ''
      }));
    res.json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error while searching YouTube.' });
  }
});

app.post('/api/admin/songs', (req, res) => {
  const b = req.body || {};
  const youtubeId = cleanText(b.youtubeId, 30);
  const title = cleanText(b.title, 180);
  if (!youtubeId || !title) return res.status(400).json({ error: 'title and youtubeId are required' });
  const catalog = readCatalog();
  if (catalog.some(s => s.youtubeId === youtubeId)) return res.status(409).json({ error: 'This YouTube video is already in the catalog.' });
  const song = {
    id: crypto.randomUUID(), title, artist: cleanText(b.artist, 120) || 'Zubeen Garg',
    year: cleanText(b.year, 20) || '—', category: cleanText(b.category, 100) || 'Assamese Modern Classics',
    youtubeId, thumbnail: cleanText(b.thumbnail, 500), enabled: true
  };
  catalog.push(song); writeCatalog(catalog); res.json({ song });
});

app.delete('/api/admin/songs/:id', (req, res) => {
  const catalog = readCatalog();
  const next = catalog.filter(s => s.id !== req.params.id);
  writeCatalog(next);
  res.json({ ok: true, items: next });
});

app.get('/api/admin/songs', (req, res) => res.json({ items: readCatalog() }));

const dist = path.join(__dirname, 'dist');
app.use(express.static(dist));
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API route not found' });
  res.sendFile(path.join(dist, 'index.html'));
});

app.listen(PORT, () => console.log(`Zubeen Radio running on port ${PORT}`));
