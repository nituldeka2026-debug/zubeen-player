import React, {useMemo, useState} from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const SONGS = [
  {id: 1, title: "Mayabini", album: "Zubeen Collection", year: "—", youtubeId: "", duration: "—"},
  {id: 2, title: "Barixa", album: "Zubeen Collection", year: "—", youtubeId: "", duration: "—"},
  {id: 3, title: "Monole Ubhoti Ahe", album: "Zubeen Collection", year: "—", youtubeId: "", duration: "—"},
  {id: 4, title: "Anamika", album: "Zubeen Collection", year: "—", youtubeId: "", duration: "—"},
  {id: 5, title: "Pakhi", album: "Zubeen Collection", year: "—", youtubeId: "", duration: "—"}
];

function App() {
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(SONGS[0]);
  const [playing, setPlaying] = useState(false);
  const [radio, setRadio] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [queue, setQueue] = useState([]);
  const [link, setLink] = useState("");
  const [notice, setNotice] = useState("");

  const filtered = useMemo(
    () => SONGS.filter(s => `${s.title} ${s.album}`.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  function playSong(song) {
    setCurrent(song);
    setPlaying(true);
    setNotice(song.youtubeId ? "" : "Add the authorised YouTube video ID in the admin/catalog data to enable playback.");
  }

  function toggleFavorite(id) {
    setFavorites(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);
  }

  function addQueue(song) {
    setQueue(q => q.some(x => x.id === song.id) ? q : [...q, song]);
  }

  function playNext() {
    const list = filtered.length ? filtered : SONGS;
    const i = list.findIndex(s => s.id === current.id);
    playSong(list[(i + 1) % list.length]);
  }

  function playPrev() {
    const list = filtered.length ? filtered : SONGS;
    const i = list.findIndex(s => s.id === current.id);
    playSong(list[(i - 1 + list.length) % list.length]);
  }

  function addOnlineLink(e) {
    e.preventDefault();
    if (!link.trim()) return;
    setNotice("Link saved for validation. This demo only accepts supported/authorised media URLs.");
    setLink("");
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">ZG</div>
          <div>
            <h1>ZUBEEN PLAYER</h1>
            <span>Simple • clean • continuous</span>
          </div>
        </div>
        <button className={`radio-btn ${radio ? "active" : ""}`} onClick={() => setRadio(!radio)}>
          {radio ? "● RADIO ON" : "○ AUTO RADIO"}
        </button>
      </header>

      <main className="layout">
        <section className="left">
          <div className="now-card">
            <div className="cover">
              <div className="cover-inner">Z</div>
            </div>
            <div className="now-info">
              <span className="eyebrow">{radio ? "AUTO RADIO" : "NOW PLAYING"}</span>
              <h2>{current.title}</h2>
              <p>Zubeen Garg</p>
              <div className="progress"><div className="progress-fill"></div></div>
              <div className="time"><span>0:00</span><span>{current.duration}</span></div>
              <div className="controls">
                <button onClick={playPrev} aria-label="Previous">↶</button>
                <button className="play" onClick={() => setPlaying(!playing)} aria-label="Play">
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

          {current.youtubeId && playing && (
            <div className="player">
              <iframe
                title="YouTube player"
                src={`https://www.youtube.com/embed/${current.youtubeId}?autoplay=1&rel=0`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {notice && <div className="notice">{notice}</div>}

          <div className="section-head">
            <h3>🎵 Songs</h3>
            <span>{filtered.length} songs</span>
          </div>

          <div className="search">
            <span>⌕</span>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Zubeen songs..." />
          </div>

          <div className="song-list">
            {filtered.map(song => (
              <div className={`song ${current.id === song.id ? "selected" : ""}`} key={song.id}>
                <button className="mini-play" onClick={() => playSong(song)}>▶</button>
                <div className="song-main" onClick={() => playSong(song)}>
                  <strong>{song.title}</strong>
                  <span>{song.album}</span>
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
            <div className="section-head">
              <h3>🔗 Add Online Link</h3>
            </div>
            <form onSubmit={addOnlineLink} className="link-form">
              <input value={link} onChange={e => setLink(e.target.value)} placeholder="Paste supported media URL" />
              <button>Add</button>
            </form>
            <small>Use only URLs that your service is authorised to play. Arbitrary websites are not supported.</small>
          </div>

          <div className="panel">
            <div className="section-head">
              <h3>📋 Queue</h3>
              <button className="clear" onClick={() => setQueue([])}>Clear</button>
            </div>
            {queue.length === 0 ? (
              <p className="empty">Your queue is empty.</p>
            ) : (
              queue.map(song => (
                <button className="queue-item" key={song.id} onClick={() => playSong(song)}>
                  <span>{song.title}</span><span>▶</span>
                </button>
              ))
            )}
          </div>

          <div className="panel install">
            <h3>📱 Install App</h3>
            <p>This project is ready to be turned into an installable PWA/Android app.</p>
            <a href="/admin.html">Open Admin Demo →</a>
          </div>
        </aside>
      </main>

      <footer>
        <span>© Zubeen Player</span>
        <span>Authorised sources only • Demo catalog</span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
