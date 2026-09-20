import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const ROTATIONS = [
  { start:'00:00', end:'08:00', title:'Borgeet, Lokgeet & Bhakti', assamese:'ভক্তি, লোকগীত আৰু বৰগীত', desc:'Quiet, soulful songs for the early hours.', cat:'Borgeet, Lokgeet & Bhakti' },
  { start:'08:00', end:'11:00', title:'Bihu & High Energy', assamese:'বিহু আৰু উচ্ছল গীত', desc:'Dhol, pepa and high-energy Assamese favourites.', cat:'Bihu & High Energy' },
  { start:'11:00', end:'17:00', title:'Assamese Modern Classics', assamese:'অসমীয়া আধুনিক ক্লাছিক', desc:'Modern classics and songs loved across generations.', cat:'Assamese Modern Classics' },
  { start:'17:00', end:'21:00', title:'Bollywood Nostalgia', assamese:'বলিউড নষ্টালজিয়া', desc:'Playback-era favourites and nostalgic melodies.', cat:'Bollywood Nostalgia' },
  { start:'21:00', end:'00:00', title:'Midnight Melodies', assamese:'মাজনিশাৰ সুৰ', desc:'Slow, soulful and unhurried.', cat:'Midnight Melodies' }
];
function rotationFor(date){const m=date.getHours()*60+date.getMinutes();return ROTATIONS[m<480?0:m<660?1:m<1020?2:m<1260?3:4]}
function clockText(d){return d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}).replace(/^0/,'')}
function youtubeThumb(id){return id?`https://i.ytimg.com/vi/${id}/hqdefault.jpg`:''}
function makeSessionId(){return window.crypto?.randomUUID?window.crypto.randomUUID():`z-${Date.now()}-${Math.random().toString(36).slice(2)}`}

function App(){
  const [songs,setSongs]=useState([]); const [current,setCurrent]=useState(null); const [clock,setClock]=useState(new Date());
  const [listeners,setListeners]=useState(0); const [playing,setPlaying]=useState(false); const [videoMode,setVideoMode]=useState(true);
  const [bg,setBg]=useState(true); const [volume,setVolume]=useState(.85); const [query,setQuery]=useState(''); const [notice,setNotice]=useState('');
  const playerRef=useRef(null); const playerReady=useRef(false); const sessionRef=useRef(localStorage.getItem('zubeen_listener_id')||makeSessionId());
  const rotation=rotationFor(clock);

  useEffect(()=>localStorage.setItem('zubeen_listener_id',sessionRef.current),[]);
  useEffect(()=>{const t=setInterval(()=>setClock(new Date()),1000);return()=>clearInterval(t)},[]);
  useEffect(()=>{(async()=>{try{const r=await fetch('/api/songs');const d=await r.json();const items=d.items||[];setSongs(items);setCurrent(prev=>prev&&items.some(x=>x.id===prev.id)?prev:items[0]||null)}catch{setNotice('Radio server connect hua nai. Render deployment check kora.')}})()},[]);
  useEffect(()=>{let alive=true;async function beat(){try{const r=await fetch('/api/listeners/heartbeat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:sessionRef.current})});const d=await r.json();if(alive)setListeners(Number(d.listeners||0))}catch{}}beat();const t=setInterval(beat,20000);return()=>{alive=false;clearInterval(t)}},[]);

  useEffect(()=>{
    window.onYouTubeIframeAPIReady=()=>{
      playerRef.current=new window.YT.Player('yt-player',{videoId:current?.youtubeId||'',playerVars:{autoplay:0,controls:1,rel:0,playsinline:1,modestbranding:1,origin:window.location.origin},events:{
        onReady:()=>{playerReady.current=true;if(current?.youtubeId)playerRef.current.cueVideoById(current.youtubeId)},
        onStateChange:e=>{if(e.data===1)setPlaying(true);if(e.data===2||e.data===5)setPlaying(false);if(e.data===0)nextSong()}
      }});
    };
    if(!document.getElementById('youtube-iframe-api')){const s=document.createElement('script');s.id='youtube-iframe-api';s.src='https://www.youtube.com/iframe_api';document.body.appendChild(s)}else if(window.YT?.Player)window.onYouTubeIframeAPIReady();
    return()=>{window.onYouTubeIframeAPIReady=null}
  },[]);
  useEffect(()=>{if(current?.youtubeId&&playerReady.current&&playerRef.current?.loadVideoById)playerRef.current.loadVideoById(current.youtubeId)},[current?.youtubeId]);
  useEffect(()=>{if(playerReady.current&&playerRef.current?.setVolume)playerRef.current.setVolume(Math.round(volume*100))},[volume]);

  const rotationSongs=useMemo(()=>songs.filter(s=>s.category===rotation.cat),[songs,rotation.cat]);
  const filtered=useMemo(()=>songs.filter(s=>`${s.title} ${s.artist}`.toLowerCase().includes(query.toLowerCase())),[songs,query]);
  const visible=(filtered.length?filtered:songs).slice(0,8);
  function playSong(song){if(!song)return;setCurrent(song);setNotice('');if(!song.youtubeId){setNotice('Ei song-r YouTube video nai. Admin page-ot embeddable video add kora.');return}setTimeout(()=>{if(playerReady.current&&playerRef.current?.loadVideoById)playerRef.current.loadVideoById(song.youtubeId)},50)}
  function togglePlay(){if(!current?.youtubeId){setNotice('Playable YouTube video nai. Admin → Search YouTube pora song add kora.');return}if(!playerReady.current){setNotice('YouTube player loading...');return}playing?playerRef.current.pauseVideo():playerRef.current.playVideo()}
  function nextSong(){const list=rotationSongs.length?rotationSongs:songs;if(!list.length)return;const i=list.findIndex(s=>s.id===current?.id);playSong(list[(i+1+list.length)%list.length])}
  function prevSong(){if(!songs.length)return;const i=songs.findIndex(s=>s.id===current?.id);playSong(songs[(i-1+songs.length)%songs.length])}
  const endMin=rotation.end==='00:00'?1440:Number(rotation.end.slice(0,2))*60;const remaining=Math.max(0,endMin-(clock.getHours()*60+clock.getMinutes()));

  return <div className={`app ${bg?'cinematic':''}`}>
    <div className="ambient one"/><div className="ambient two"/>
    <header className="topbar"><div><div className="clock">{clockText(clock)}</div><div className="date">{clock.toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).toUpperCase()}</div></div><div className="onair"><i/> ON AIR • {rotation.title.toUpperCase()}</div><nav><a href="/schedule.html">Schedule</a><a href="/admin.html">Admin</a></nav></header>
    <main>
      <div className="listen">● {listeners} LISTENING</div>
      <section className="hero"><div className="signal">⌁</div><h1>জুবিন দা ৰেডিঅ’</h1><div className="subtitle">ZUBEEN RADIO</div>
        <div className={`player-card ${videoMode?'video-open':'video-closed'}`}>
          <div className="art-side"><div className="cover">{current?.thumbnail||youtubeThumb(current?.youtubeId)?<img src={current.thumbnail||youtubeThumb(current.youtubeId)} alt=""/>:<div className="cover-placeholder">ZG</div>}</div><div className="mini-onair">● ON AIR<br/><span>{rotation.title}</span></div></div>
          <div className="player-info"><div className="label">NOW PLAYING <span>{current?'LIVE RADIO':''}</span></div><h2>{current?.title||'Zubeen Radio'}</h2><p>{current?.artist||'Add songs from Admin'} {current?.year&&<><b>•</b> {current.year}</>}</p>
            <div className="video-box"><div id="yt-player"/></div>
            <div className="fake-controls"><button onClick={prevSong}>◀</button><button className="main-play" onClick={togglePlay}>{playing?'Ⅱ':'▶'}</button><button onClick={nextSong}>▶</button><div className="fake-wave">▁▂▃▅▆▇▆▃▅▂▁▃▆▅▃</div><input aria-label="volume" type="range" min="0" max="1" step=".01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></div>
            <div className="player-actions"><button className={bg?'active':''} onClick={()=>setBg(v=>!v)}>◒ BACKGROUND</button><button className={videoMode?'active':''} onClick={()=>setVideoMode(v=>!v)}>🎬 VIDEO</button><span>OFFICIAL YOUTUBE PLAYER</span></div>
          </div>
        </div>
      </section>
      {notice&&<div className="notice">{notice}</div>}
      <section className="radio-strip"><div><strong>{rotation.title}</strong><span> • ON AIR</span></div><div>{remaining}m left</div><div className="status">● AUTO RADIO</div></section>
      <section className="below"><div><div className="section-title"><h2>Up next</h2><span>{rotationSongs.length||songs.length} tracks</span></div><div className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search songs"/></div>{visible.map((s,i)=><div className={`track ${s.id===current?.id?'current':''}`} key={s.id} onClick={()=>playSong(s)}><span className="num">{String(i+1).padStart(2,'0')}</span><span className="track-name"><b>{s.title}</b><small>{s.artist} • {s.year}</small></span><span>{s.id===current?.id?'● ON AIR':'▶'}</span></div>)}</div><div className="schedule-mini"><div className="section-title"><h2>Today</h2><a href="/schedule.html">Full schedule →</a></div>{ROTATIONS.map(r=><div className={`schedule-row ${r.title===rotation.title?'active':''}`} key={r.title}><span>{r.start} – {r.end}</span><b>{r.title}</b></div>)}<p>Five rotations a day, controlled by the clock.</p></div></section>
    </main><footer>YOUTUBE VIDEO PLAYBACK • REAL ACTIVE LISTENER HEARTBEAT • FIVE DAILY ROTATIONS</footer>
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);
