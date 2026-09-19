import React, {useEffect, useMemo, useRef, useState} from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

// Add ONLY audio URLs that your service is authorised to stream.
// YouTube video IDs are metadata only; they are not treated as audio URLs.
const DEFAULT_SONGS = [
  {id: 1, title: "Mayabini", artist: "Zubeen Garg", album: "Zubeen Collection", year: "—", audioUrl: "", duration: "—"},
  {id: 2, title: "Barixa", artist: "Zubeen Garg", album: "Zubeen Collection", year: "—", audioUrl: "", duration: "—"},
  {id: 3, title: "Monole Ubhoti Ahe", artist: "Zubeen Garg", album: "Zubeen Collection", year: "—", audioUrl: "", duration: "—"},
  {id: 4, title: "Anamika", artist: "Zubeen Garg", album: "Zubeen Collection", year: "—", audioUrl: "", duration: "—"},
  {id: 5, title: "Pakhi", artist: "Zubeen Garg", album: "Zubeen Collection", year: "—", audioUrl: "", duration: "—"}
];

function formatTime(value) {
  if (!Number.isFinite(value)) return "0:00";
  const m = Math.floor(value / 60);
  const s = Math.floor(value % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function App() {
  const audioRef = useRef(null);
  const [songs, setSongs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("zubeen_songs")) || DEFAULT_SONGS; } catch { return DEFAULT_SONGS; }
  });
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(() => {
    try { return (JSON.parse(localStorage.getItem("zubeen_songs")) || DEFAULT_SONGS)[0]; } catch { return DEFAULT_SONGS[0]; }
  });
  const [playing, setPlaying] = useState(false);
  const [radio, setRadio] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [queue, setQueue] = useState([]);
  const [notice, setNotice] = useState("Select a song with an authorised audio source to start playback.");
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const filtered = useMemo(
    () => songs.filter(s => `${s.title} ${s.artist} ${s.album}`.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!current.audioUrl) {
      audio.pause();
      setPlaying(false);
      return;
    }
    audio.load();
    if (playing) {
      audio.play().catch(() => {
        setPlaying(false);
        setNotice("Playback was blocked. Tap Play again or check the audio source.");
      });
    }
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  function playSong(song, start = true) {
    setCurrent(song);
    setPosition(0);
    setDuration(0);
    if (!song.audioUrl) {
      setPlaying(false);
      setNotice("Audio source unavailable for this song. Add an authorised audio URL in the catalog/admin backend.");
      return;
    }
    setNotice("");
    setPlaying(start);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!current.audioUrl) {
      setNotice("Audio source unavailable for this song. Add an authorised audio URL in the catalog/admin backend.");
      return;
    }
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => setNotice("Could not start this audio source."));
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function nextSong() {
    if (queue.length) {
      const [next, ...rest] = queue;
      setQueue(rest);
      playSong(next);
      return;
    }
    const list = filtered.length ? filtered : songs;
    const i = list.findIndex(s => s.id === current.id);
    playSong(list[(i + 1 + list.length) % list.length]);
  }

  function prevSong() {
    const list = filtered.length ? filtered : songs;
    const i = list.findIndex(s => s.id === current.id);
    playSong(list[(i - 1 + list.length) % list.length]);
  }

  function handleEnded() {
    setPlaying(false);
    if (radio) {
      setTimeout(nextSong, 50);
    }
  }

  function toggleFavorite(id) {
    setFavorites(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);
  }

  function addQueue(song) {
    setQueue(q => q.some(x => x.id === song.id) ? q : [...q, song]);
    setNotice(`${song.title} added to queue.`);
  }

  function seek(e) {
    const value = Number(e.target.value);
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = value;
    setPosition(value);
  }

  return (
    <div className="app">
      <audio
        ref={audioRef}
        src={current.audioUrl || undefined}
        preload="metadata"
        onTimeUpdate={e => setPosition(e.currentTarget.currentTime)}
        onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={handleEnded}
        onError={() => { setPlaying(false); setNotice("This audio source could not be loaded. Check that the URL is direct, reachable and authorised."); }}
      />

      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">ZG</div>
          <div><h1>ZUBEEN PLAYER</h1><span>Radio • Song Player</span></div>
        </div>
        <button className={`radio-btn ${radio ? "active" : ""}`} onClick={() => setRadio(v => !v)}>
          {radio ? "● RADIO ON" : "○ AUTO RADIO"}
        </button>
      </header>

      <main className="layout">
        <section className="left">
          <div className="now-card">
            <div className="cover"><div className="cover-inner">Z</div></div>
            <div className="now-info">
              <span className="eyebrow">{radio ? "AUTO RADIO" : "NOW PLAYING"}</span>
              <h2>{current.title}</h2>
              <p>{current.artist}</p>
              <input className="progress-range" type="range" min="0" max={duration || 0} step="0.1" value={Math.min(position, duration || 0)} onChange={seek} disabled={!duration} />
              <div className="time"><span>{formatTime(position)}</span><span>{duration ? formatTime(duration) : current.duration}</span></div>
              <div className="controls">
                <button onClick={prevSong} aria-label="Previous">↶</button>
                <button className="play" onClick={togglePlay} aria-label="Play">{playing ? "Ⅱ" : "▶"}</button>
                <button onClick={nextSong} aria-label="Next">↷</button>
                <button onClick={() => addQueue(current)} aria-label="Queue">＋</button>
                <button onClick={() => toggleFavorite(current.id)} className={favorites.includes(current.id) ? "liked" : ""} aria-label="Favorite">{favorites.includes(current.id) ? "♥" : "♡"}</button>
              </div>
              <div className="volume"><span>🔊</span><input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(Number(e.target.value))}/></div>
            </div>
          </div>

          {notice && <div className="notice">{notice}</div>}

          <div className="section-head"><h3>🎵 Songs</h3><span>{filtered.length} songs</span></div>
          <div className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Zubeen songs..." /></div>
          <div className="song-list">
            {filtered.map(song => (
              <div className={`song ${current.id === song.id ? "selected" : ""}`} key={song.id}>
                <button className="mini-play" onClick={() => playSong(song)}>▶</button>
                <div className="song-main" onClick={() => playSong(song)}><strong>{song.title}</strong><span>{song.artist} • {song.album}</span></div>
                <button className="icon" onClick={() => addQueue(song)}>＋</button>
                <button className={`icon ${favorites.includes(song.id) ? "liked" : ""}`} onClick={() => toggleFavorite(song.id)}>{favorites.includes(song.id) ? "♥" : "♡"}</button>
              </div>
            ))}
          </div>
        </section>

        <aside className="right">
          <div className="panel"><div className="section-head"><h3>📻 Radio</h3><span>{radio ? "Playing automatically" : "Off"}</span></div><p className="empty">Turn on Auto Radio. When a song ends, the next available song starts automatically. Queue items play first.</p></div>
          <div className="panel">
            <div className="section-head"><h3>📋 Queue</h3><button className="clear" onClick={() => setQueue([])}>Clear</button></div>
            {queue.length === 0 ? <p className="empty">Your queue is empty.</p> : queue.map(song => <button className="queue-item" key={song.id} onClick={() => playSong(song)}><span>{song.title}</span><span>▶</span></button>)}
          </div>
          <div className="panel"><h3>🎧 Audio Source</h3><p className="empty">The player uses the browser's HTML5 audio engine. Add direct, authorised audio URLs to each song's <code>audioUrl</code>. YouTube video IDs are not converted into MP3/audio streams.</p><a className="admin-link" href="/admin.html">Open Admin →</a></div>
        </aside>
      </main>
      <footer><span>© Zubeen Player</span><span>Authorised audio sources only</span></footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
