import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const ROTATIONS = [
  { start:'00:00', end:'08:00', title:'Borgeet, Lokgeet & Bhakti', assamese:'ভক্তি, লোকগীত আৰু বৰগীত', desc:'Quiet, soulful songs before sunrise, for the light hours.', cat:'Borgeet, Lokgeet & Bhakti' },
  { start:'08:00', end:'11:00', title:'Bihu & High Energy', assamese:'বিহু আৰু উচ্ছল গীত', desc:'Dhol, pepa, jogon. The morning belongs to the fields.', cat:'Bihu & High Energy' },
  { start:'11:00', end:'17:00', title:'Assamese Modern Classics', assamese:'অসমীয়া আধুনিক ক্লাছিক', desc:'Aarohora, Monoleu, Maya — songs that raised a generation.', cat:'Assamese Modern Classics' },
  { start:'17:00', end:'21:00', title:'Bollywood Nostalgia', assamese:'বলিউড নষ্টালজিয়া', desc:'The playback years, when the rest of the country learned his voice.', cat:'Bollywood Nostalgia' },
  { start:'21:00', end:'00:00', title:'Midnight Melodies', assamese:'মাজনিশাৰ সুৰ', desc:'Slow, soulful, unhurried. For the ones still awake.', cat:'Midnight Melodies' }
];

function rotationFor(date){
  const m=date.getHours()*60+date.getMinutes();
  return ROTATIONS[m<480?0:m<660?1:m<1020?2:m<1260?3:4];
}
function clockText(d){return d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}).replace(/^0/,'')}
function youtubeEmbed(id){return id?`https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1&modestbranding=1`:''}
function youtubeThumb(id){return id?`https://i.ytimg.com/vi/${id}/hqdefault.jpg`:''}
function makeSessionId(){return window.crypto?.randomUUID?window.crypto.randomUUID():`z-${Date.now()}-${Math.random().toString(36).slice(2)}`}
function fmtSeconds(s){if(!Number.isFinite(s))return '0:00';const m=Math.floor(s/60);const sec=Math.floor(s%60).toString().padStart(2,'0');return `${m}:${sec}`}

function App(){
  const [songs,setSongs]=useState([]);
  const [current,setCurrent]=useState(null);
  const [clock,setClock]=useState(new Date());
  const [listeners,setListeners]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [bg,setBg]=useState(true);
  const [volume,setVolume]=useState(.85);
  const [query,setQuery]=useState('');
  const [notice,setNotice]=useState('');
  const [audioTime,setAudioTime]=useState(0);
  const [audioDuration,setAudioDuration]=useState(0);
  const audioRef=useRef(null);
  const ytRef=useRef(null);
  const ytReady=useRef(false);
  const sessionRef=useRef(localStorage.getItem('zubeen_listener_id')||makeSessionId());
  const rotation=rotationFor(clock);

  useEffect(()=>localStorage.setItem('zubeen_listener_id',sessionRef.current),[]);
  useEffect(()=>{const t=setInterval(()=>setClock(new Date()),1000);return()=>clearInterval(t)},[]);

  async function loadSongs(){
    try{
      const r=await fetch('/api/songs');
      const d=await r.json();
      const items=d.items||[];
      setSongs(items);
      setCurrent(prev=>prev&&items.some(x=>x.id===prev.id)?prev:items[0]||null);
      setNotice('');
    }catch{setNotice('Radio server connect hua nai. Render deployment check kora.')}
  }
  useEffect(()=>{loadSongs()},[]);

  useEffect(()=>{
    let alive=true;
    async function beat(){
      try{
        const r=await fetch('/api/listeners/heartbeat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:sessionRef.current})});
        const d=await r.json();
        if(alive)setListeners(Number(d.listeners||0));
      }catch{}
    }
    beat(); const t=setInterval(beat,20000); return()=>{alive=false;clearInterval(t)};
  },[]);

  const rotationSongs=useMemo(()=>songs.filter(s=>s.category===rotation.cat),[songs,rotation.cat]);
  const filtered=useMemo(()=>songs.filter(s=>`${s.title} ${s.artist} ${s.category}`.toLowerCase().includes(query.toLowerCase())),[songs,query]);
  const visible=(filtered.length?filtered:(rotationSongs.length?rotationSongs:songs)).slice(0,8);

  useEffect(()=>{
    let disposed=false;
    window.onYouTubeIframeAPIReady=()=>{
      if(disposed || !window.YT || ytRef.current)return;
      ytRef.current=new window.YT.Player('yt-player',{
        width:'100%',height:'100%',videoId:'',
        playerVars:{controls:0,rel:0,playsinline:1,modestbranding:1},
        events:{
          onReady:()=>{ytReady.current=true},
          onStateChange:e=>{
            if(e.data===window.YT.PlayerState.PLAYING)setPlaying(true);
            if(e.data===window.YT.PlayerState.PAUSED || e.data===window.YT.PlayerState.CUED)setPlaying(false);
            if(e.data===window.YT.PlayerState.ENDED){setPlaying(false);nextSong()}
          },
          onError:()=>setNotice('Ei YouTube video playback unavailable. Admin-ot another embeddable video add kora.')
        }
      });
    };
    if(!document.getElementById('youtube-iframe-api')){
      const s=document.createElement('script');s.id='youtube-iframe-api';s.src='https://www.youtube.com/iframe_api';document.body.appendChild(s);
    }else if(window.YT?.Player){window.onYouTubeIframeAPIReady()}
    return()=>{disposed=true;window.onYouTubeIframeAPIReady=null};
  },[]);

  useEffect(()=>{
    if(!current?.youtubeId || current?.audioUrl || !ytReady.current || !ytRef.current)return;
    try{ytRef.current.cueVideoById(current.youtubeId);setPlaying(false)}catch{}
  },[current?.id,current?.youtubeId,current?.audioUrl]);

  useEffect(()=>{
    if(ytReady.current&&ytRef.current?.setVolume)ytRef.current.setVolume(Math.round(volume*100));
  },[volume]);

  useEffect(()=>{
    if(!current)return;
    setPlaying(false); setAudioTime(0); setAudioDuration(0);
    const a=audioRef.current;
    if(a){a.pause();a.currentTime=0;a.volume=volume;}
    if(current.audioUrl){
      // Authorized direct audio URL: use HTML5 audio.
      setNotice('');
    }else if(current.youtubeId){
      // No MP3: the embedded YouTube video is the playback source.
      setNotice('');
    }else{
      setNotice('Ei song-r MP3 ba YouTube video nai. Admin-ot source add kora.');
    }
  },[current?.id]);

  useEffect(()=>{if(audioRef.current)audioRef.current.volume=volume},[volume]);

  function playSong(song){if(!song)return;setCurrent(song);setNotice('')}
  function togglePlay(){
    if(!current){setNotice('Admin-ot songs add kora.');return}
    if(current.audioUrl){
      const a=audioRef.current;
      if(!a)return;
      if(a.paused){a.play().then(()=>setPlaying(true)).catch(()=>setNotice('Browser-e audio playback block hoise. Play button abar click kora.'))}
      else{a.pause();setPlaying(false)}
      return;
    }
    if(current.youtubeId){
      if(!ytReady.current||!ytRef.current){setNotice('Video player loading...');return}
      try{
        if(playing)ytRef.current.pauseVideo();
        else ytRef.current.playVideo();
        setNotice('');
      }catch{setNotice('Video playback failed.')}
      return;
    }
    setNotice('Playable MP3/YouTube source nai.');
  }
  function nextSong(){
    const list=rotationSongs.length?rotationSongs:songs;
    if(!list.length)return;
    const i=list.findIndex(s=>s.id===current?.id);
    playSong(list[(i+1+list.length)%list.length]);
  }
  function prevSong(){
    const list=rotationSongs.length?rotationSongs:songs;
    if(!list.length)return;
    const i=list.findIndex(s=>s.id===current?.id);
    playSong(list[(i-1+list.length)%list.length]);
  }
  function onAudioEnded(){setPlaying(false);nextSong()}
  function onAudioLoaded(){const d=audioRef.current?.duration||0;setAudioDuration(d)}
  function seek(e){if(!audioRef.current||!audioDuration)return;audioRef.current.currentTime=(Number(e.target.value)/100)*audioDuration;setAudioTime(audioRef.current.currentTime)}

  const endMin=rotation.end==='00:00'?1440:Number(rotation.end.slice(0,2))*60;
  const nowMin=clock.getHours()*60+clock.getMinutes();
  const remaining=Math.max(0,endMin-nowMin);
  const progress=current?.audioUrl&&audioDuration?Math.min(100,(audioTime/audioDuration)*100):0;
  const mediaIsVideo=Boolean(current?.youtubeId&&!current?.audioUrl);

  return <div className={`app ${bg?'cinematic':''}`} style={current?.thumbnail&&bg?{'--song-bg':`url("${current.thumbnail}")`}:undefined}>
    <div className="bg-image"/><div className="grain"/>
    <header className="topbar">
      <div><div className="clock">{clockText(clock)}</div><div className="date">{clock.toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).toUpperCase()}</div></div>
      <div className="onair"><i/> ON AIR • {rotation.title.toUpperCase()}</div>
      <nav><a href="https://www.youtube.com/" target="_blank" rel="noreferrer">YouTube</a><a href="/schedule.html">Schedule</a><a href="/admin.html">Admin</a></nav>
    </header>

    <main>
      <div className="listen">◉ {listeners} LISTENING</div>
      <section className="hero">
        <div className="signal">◉</div>
        <h1>জুবিন দা ৰেডিঅ’</h1>
        <div className="subtitle">ZUBEEN RADIO</div>
        <div className="player-card">
          <div className="media-side">
            <div className="media-frame">
              {!mediaIsVideo && (current?.thumbnail||current?.youtubeId ? <img src={current.thumbnail||youtubeThumb(current.youtubeId)} alt="Now playing"/> : <div className="cover-placeholder">ZG</div>)}<div id="yt-player" className={`yt-player ${mediaIsVideo?'show':'hide'}`}/>
              <div className="media-badge">{mediaIsVideo?'FULL VIDEO':current?.audioUrl?'MP3 AUDIO':'OFF AIR'}</div>
            </div>
            <div className="mini-onair"><span>● ON AIR</span><b>{rotation.title}</b></div>
          </div>

          <div className="player-info">
            <div className="label">NOW PLAYING <span>{current?'• LIVE RADIO':''}</span></div>
            <h2>{current?.title||'Zubeen Radio'}</h2>
            <p>{current?.artist||'Add songs from Admin'} {current?.year&&<><b>•</b> {current.year}</>}</p>
            <div className="meta-line">{current?.audioUrl?'DIRECT MP3':'YOUTUBE VIDEO'} <span>•</span> {current?.category||rotation.title}</div>

            <div className="timeline">
              <span>{current?.audioUrl?fmtSeconds(audioTime):'0:00'}</span>
              <input type="range" min="0" max="100" value={current?.audioUrl?progress:0} onChange={seek} disabled={!current?.audioUrl||!audioDuration}/>
              <span>{current?.audioUrl?fmtSeconds(audioDuration):'—'}</span>
            </div>

            <div className="controls">
              <button onClick={prevSong} aria-label="Previous">◀</button>
              <button className="main-play" onClick={togglePlay} aria-label="Play">{playing?'Ⅱ':'▶'}</button>
              <button onClick={nextSong} aria-label="Next">▶</button>
              <div className="wave"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div>
              <input className="volume" aria-label="Volume" type="range" min="0" max="1" step=".01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/>
            </div>

            <div className="player-actions">
              <button className={bg?'active':''} onClick={()=>setBg(v=>!v)}>◒ BACKGROUND</button>
              <button className="active">◉ {mediaIsVideo?'VIDEO':'AUDIO'}</button>
              <span>YOUTUBE • RADIO PLAYER</span>
            </div>
            <audio ref={audioRef} src={current?.audioUrl||''} onLoadedMetadata={onAudioLoaded} onTimeUpdate={()=>setAudioTime(audioRef.current?.currentTime||0)} onEnded={onAudioEnded} preload="metadata"/>
          </div>
        </div>
      </section>

      {notice&&<div className="notice">{notice}</div>}

      <section className="radio-strip">
        <div><strong>{rotation.title}</strong><span> • ON AIR</span></div>
        <div>{remaining} MIN LEFT</div>
        <div className="status">● AUTO RADIO</div>
      </section>

      <section className="below">
        <div>
          <div className="section-title"><h2>Up next</h2><span>{rotationSongs.length||songs.length} tracks</span></div>
          <div className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search songs"/></div>
          {visible.map((s,i)=><div className={`track ${s.id===current?.id?'current':''}`} key={s.id} onClick={()=>playSong(s)}>
            <span className="num">{String(i+1).padStart(2,'0')}</span>
            <span className="track-thumb">{s.thumbnail?<img src={s.thumbnail} alt=""/>:<span>♪</span>}</span>
            <span className="track-name"><b>{s.title}</b><small>{s.artist} • {s.year}</small></span>
            <span>{s.id===current?.id?'● ON AIR':'▶'}</span>
          </div>)}
        </div>
        <div className="schedule-mini">
          <div className="section-title"><h2>Today</h2><a href="/schedule.html">Full schedule →</a></div>
          {ROTATIONS.map(r=><div className={`schedule-row ${r.title===rotation.title?'active':''}`} key={r.title}><span>{r.start} – {r.end}</span><div><b>{r.title}</b><small>{r.assamese}</small><em>{r.desc}</em></div>{r.title===rotation.title&&<strong>● ON AIR</strong>}</div>)}
          <p>Five rotations a day, controlled by the clock in Guwahati. The station stays free and plays automatically.</p>
        </div>
      </section>
    </main>
    <footer>FIVE ROTATIONS A DAY • MP3 WHEN AVAILABLE • YOUTUBE VIDEO FALLBACK • LIVE LISTENER COUNT</footer>
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);
