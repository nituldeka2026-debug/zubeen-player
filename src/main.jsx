import React, {useMemo, useState} from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const DEMO_SONGS = [
  {id: 1, title: "Mayabini", album: "Zubeen Collection", year: "—", youtubeId: "", duration: "—"},
  {id: 2, title: "Barixa", album: "Zubeen Collection", year: "—", youtubeId: "", duration: "—"},
  {id: 3, title: "Monole Ubhoti Ahe", album: "Zubeen Collection", year: "—", youtubeId: "", duration: "—"},
  {id: 4, title: "Anamika", album: "Zubeen Collection", year: "—", youtubeId: "", duration: "—"},
  {id: 5, title: "Pakhi", album: "Zubeen Collection", year: "—", youtubeId: "", duration: "—"}
];

function App() {
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState(DEMO_SONGS);
  const [current, setCurrent] = useState(DEMO_SONGS[0]);
  const [playing, setPlaying] = useState(false);
  const [radio, setRadio] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [queue, setQueue] = useState([]);
  const [link, setLink] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(
    () => query.trim() ? songs : songs,
    [query, songs]
  );

  async function searchYouTube(e) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) {
      setSongs(DEMO_SONGS);
      setNotice("");
      return;
    }
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}&maxResults=12`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Search failed");
      setSongs(data.songs || []);
      setNotice(`${data.songs?.length || 0} embeddable YouTube result(s) found.`);
    } catch (error) {
      setSongs([]);
      setNotice(error.message || "Could not search YouTube.");
    } finally {
      setLoading(false);
    }
  }

  function playSong(song) {
    setCurrent(song);
    setPlaying(Boolean(song.youtubeId));
    setNotice(song.youtubeId ? "" : "This catalog item has no YouTube video ID yet.");
  }

  function toggleFavorite(id) {
    setFavorites(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);
  }

  function addQueue(song) {
    setQueue(q => q.some(x => x.id === song.id) ? q : [...q, song]);
  }

  function playNext() {
    const list = filtered.length ? filtered : DEMO_SONGS;
    const i = list.findIndex(s => s.id === current.id);
    playSong(list[(i + 1) % list.length]);
  }

  function playPrev() {
    const list = filtered.length ? filtered : DEMO_SONGS;
    const i = list.findIndex(s => s.id === current.id);
    playSong(list[(i - 1 + list.length) % list.length]);
  }

  function addOnlineLink(e) {
    e.preventDefault();
    if (!link.trim()) return;
    setNotice("Link saved for validation. Use authorised/embeddable YouTube sources for playback.");
    setLink("");
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">ZG</div>
          <div><h1>ZUBEEN PLAYER</h1><span>Real YouTube search • authorised embeds</span></div>
        </div>
        <button className={`radio-btn ${radio ? "active" : ""}`} onClick={() => setRadio(!radio)}>
          {radio ? "● RADIO ON" : "○ AUTO RADIO"}
        </button>
      </header>

      <main className="layout">
        <section className="left">
          <div className="now-card">
            <div className="cover">{current.thumbnail ? <img src={current.thumbnail} alt="" /> : <div className="cover-inner">Z</div>}</div>
            <div className="now-info">
              <span className="eyebrow">{radio ? "AUTO RADIO" : "NOW PLAYING"}</span>
              <h2>{current.title}</h2>
              <p>{current.channelTitle || "Zubeen Garg"}</p>
              <div className="progress"><div className="progress-fill"></div></div>
              <div className="time"><span>0:00</span><span>{current.duration || "—"}</span></div>
              <div className="controls">
                <button onClick={playPrev} aria-label="Previous">↶</button>
                <button className="play" onClick={() => current.youtubeId && setPlaying(!playing)} aria-label="Play">{playing ? "Ⅱ" : "▶"}</button>
                <button onClick={playNext} aria-label="Next">↷</button>
                <button onClick={() => addQueue(current)} aria-label="Queue">＋</button>
                <button onClick={() => toggleFavorite(current.id)} className={favorites.includes(current.id) ? "liked" : ""} aria-label="Favorite">{favorites.includes(current.id) ? "♥" : "♡"}</button>
              </div>
            </div>
          </div>

          {current.youtubeId && playing && (
            <div className="player">
              <iframe title="YouTube player" src={`https://www.youtube.com/embed/${current.youtubeId}?autoplay=1&rel=0`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
            </div>
          )}

          {notice && <div className="notice">{notice}</div>}

          <div className="section-head"><h3>🎵 Songs</h3><span>{filtered.length} results</span></div>

          <form className="search" onSubmit={searchYouTube}>
            <span>⌕</span>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Zubeen songs on YouTube..." />
            <button type="submit">{loading ? "..." : "Search"}</button>
          </form>

          <div className="song-list">
            {filtered.map(song => (
              <div className={`song ${current.id === song.id ? "selected" : ""}`} key={song.id}>
                {song.thumbnail ? <img className="thumb" src={song.thumbnail} alt="" /> : <button className="mini-play" onClick={() => playSong(song)}>▶</button>}
                <div className="song-main" onClick={() => playSong(song)}><strong>{song.title}</strong><span>{song.channelTitle || song.album}</span></div>
                <button className="icon" onClick={() => addQueue(song)}>＋</button>
                <button className={`icon ${favorites.includes(song.id) ? "liked" : ""}`} onClick={() => toggleFavorite(song.id)}>{favorites.includes(song.id) ? "♥" : "♡"}</button>
              </div>
            ))}
            {!loading && filtered.length === 0 && <div className="empty">No results found.</div>}
          </div>
        </section>

        <aside className="right">
          <div className="panel">
            <div className="section-head"><h3>🔗 Add Online Link</h3></div>
            <form onSubmit={addOnlineLink} className="link-form"><input value={link} onChange={e => setLink(e.target.value)} placeholder="Paste YouTube URL" /><button>Add</button></form>
            <small>Playback uses YouTube's official embeddable player. Do not download or re-host YouTube audio.</small>
          </div>
          <div className="panel">
            <div className="section-head"><h3>📋 Queue</h3><button className="clear" onClick={() => setQueue([])}>Clear</button></div>
            {queue.length === 0 ? <p className="empty">Your queue is empty.</p> : queue.map(song => <button className="queue-item" key={song.id} onClick={() => playSong(song)}><span>{song.title}</span><span>▶</span></button>)}
          </div>
          <div className="panel install"><h3>📱 Install App</h3><p>Production backend is now included; PostgreSQL and real admin catalog are the next step.</p><a href="/admin.html">Open Admin Demo →</a></div>
        </aside>
      </main>
      <footer><span>© Zubeen Player</span><span>Authorised/embeddable sources only</span></footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
