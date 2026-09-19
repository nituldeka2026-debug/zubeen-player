import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const DEFAULT_SONGS = [
  { id: "demo-1", title: "Mayabini", album: "Zubeen Collection", youtubeId: "" },
  { id: "demo-2", title: "Barixa", album: "Zubeen Collection", youtubeId: "" },
  { id: "demo-3", title: "Monole Ubhoti Ahe", album: "Zubeen Collection", youtubeId: "" },
  { id: "demo-4", title: "Anamika", album: "Zubeen Collection", youtubeId: "" },
  { id: "demo-5", title: "Pakhi", album: "Zubeen Collection", youtubeId: "" }
];

function App() {
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState(DEFAULT_SONGS);
  const [current, setCurrent] = useState(DEFAULT_SONGS[0]);
  const [playing, setPlaying] = useState(false);
  const [radio, setRadio] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [queue, setQueue] = useState([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => songs.filter(s =>
    `${s.title} ${s.album} ${s.channelTitle || ""}`.toLowerCase().includes(query.toLowerCase())
  ), [songs, query]);

  async function searchYouTube(e) {
    const q = query.trim();
    if (e) e.preventDefault();
    if (!q) return;
    setLoading(true);
    setNotice("");
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "YouTube search failed");
      const found = (data.items || []).map(x => ({
        id: x.id,
        title: x.title,
        album: x.channelTitle || "YouTube",
        channelTitle: x.channelTitle,
        youtubeId: x.id,
        thumbnail: x.thumbnail,
        duration: "—"
      }));
      setSongs(found.length ? found : []);
      if (found.length) {
        setCurrent(found[0]);
        setPlaying(false);
      } else {
        setCurrent(null);
        setNotice("No embeddable public videos found for this search.");
      }
    } catch (err) {
      setNotice(err.message || "Search failed. Check Render server configuration.");
    } finally {
      setLoading(false);
    }
  }

  function playSong(song) {
    if (!song?.youtubeId) {
      setNotice("This song has no playable YouTube video ID yet.");
      return;
    }
    setCurrent(song);
    setPlaying(false);
    setNotice("");
    // Wait one tick so the iframe is created by the click action before autoplay starts.
    requestAnimationFrame(() => setPlaying(true));
  }

  function toggleFavorite(id) {
    setFavorites(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);
  }

  function addQueue(song) {
    setQueue(q => q.some(x => x.id === song.id) ? q : [...q, song]);
  }

  function playNext() {
    const list = filtered.length ? filtered : songs;
    if (!list.length || !current) return;
    const i = list.findIndex(s => s.id === current.id);
    playSong(list[(i + 1) % list.length]);
  }

  function playPrev() {
    const list = filtered.length ? filtered : songs;
    if (!list.length || !current) return;
    const i = list.findIndex(s => s.id === current.id);
    playSong(list[(i - 1 + list.length) % list.length]);
  }

  useEffect(() => {
    if (radio && songs.length && !current) playSong(songs[0]);
  }, [radio, songs, current]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">ZG</div>
          <div><h1>ZUBEEN PLAYER</h1><span>Real YouTube music player</span></div>
        </div>
        <button className={`radio-btn ${radio ? "active" : ""}`} onClick={() => setRadio(!radio)}>
          {radio ? "● RADIO ON" : "○ AUTO RADIO"}
        </button>
      </header>

      <main className="layout">
        <section className="left">
          {current ? (
            <div className="now-card">
              <div className="cover">
                {current.thumbnail ? <img src={current.thumbnail} alt="" /> : <div className="cover-inner">Z</div>}
              </div>
              <div className="now-info">
                <span className="eyebrow">{radio ? "AUTO RADIO" : "NOW PLAYING"}</span>
                <h2>{current.title}</h2>
                <p>{current.channelTitle || "Zubeen Garg"}</p>
                <div className="controls">
                  <button onClick={playPrev} aria-label="Previous">↶</button>
                  <button className="play" onClick={() => playing ? setPlaying(false) : playSong(current)} aria-label="Play">
                    {playing ? "Ⅱ" : "▶"}
                  </button>
                  <button onClick={playNext} aria-label="Next">↷</button>
                  <button onClick={() => addQueue(current)} aria-label="Queue">＋</button>
                  <button onClick={() => toggleFavorite(current.id)} className={favorites.includes(current.id) ? "liked" : ""} aria-label="Favorite">
                    {favorites.includes(current.id) ? "♥" : "♡"}
                  </button>
                </div>
              </div>
            </div>
          ) : <div className="notice">Search for a Zubeen song to start playing.</div>}

          {current?.youtubeId && playing && (
            <div className="player">
              <iframe
                title={current.title}
                src={`https://www.youtube.com/embed/${encodeURIComponent(current.youtubeId)}?autoplay=1&rel=0&playsinline=1&enablejsapi=1`}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          )}

          {notice && <div className="notice">{notice}</div>}

          <div className="section-head"><h3>🎵 Songs</h3><span>{filtered.length} songs</span></div>
          <form className="search" onSubmit={searchYouTube}>
            <span>⌕</span>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Zubeen songs on YouTube..." />
            <button type="submit">{loading ? "..." : "Search"}</button>
          </form>

          <div className="song-list">
            {filtered.map(song => (
              <div className={`song ${current?.id === song.id ? "selected" : ""}`} key={song.id}>
                {song.thumbnail ? <img className="thumb" src={song.thumbnail} alt="" /> : null}
                <button className="mini-play" onClick={() => playSong(song)}>▶</button>
                <div className="song-main" onClick={() => playSong(song)}>
                  <strong>{song.title}</strong><span>{song.album}</span>
                </div>
                <button className="icon" onClick={() => addQueue(song)}>＋</button>
                <button className={`icon ${favorites.includes(song.id) ? "liked" : ""}`} onClick={() => toggleFavorite(song.id)}>
                  {favorites.includes(song.id) ? "♥" : "♡"}
                </button>
              </div>
            ))}
          </div>
        </section>

        <aside className="right">
          <div className="panel">
            <div className="section-head"><h3>▶ YouTube Player</h3></div>
            <p className="empty">Search results are checked for public, embeddable videos before they can play.</p>
          </div>
          <div className="panel">
            <div className="section-head"><h3>📋 Queue</h3><button className="clear" onClick={() => setQueue([])}>Clear</button></div>
            {queue.length === 0 ? <p className="empty">Your queue is empty.</p> : queue.map(song => (
              <button className="queue-item" key={song.id} onClick={() => playSong(song)}><span>{song.title}</span><span>▶</span></button>
            ))}
          </div>
          <div className="panel install"><h3>📱 Install App</h3><p>Ready to become a PWA/Android app later.</p><a href="/admin.html">Open Admin →</a></div>
        </aside>
      </main>
      <footer><span>© Zubeen Player</span><span>Public + embeddable YouTube sources only</span></footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
