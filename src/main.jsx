import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

const DEFAULT_SONGS = [
  {id:1,title:'Phoolate Bohagare',artist:'Zubeen Garg',year:'2022',category:'Bihu & High Energy',youtubeId:'',thumbnail:''},
  {id:2,title:'Mayabini',artist:'Zubeen Garg',year:'—',category:'Assamese Modern Classics',youtubeId:'',thumbnail:''},
  {id:3,title:'Monole Ubhoti Ahe',artist:'Zubeen Garg',year:'—',category:'Assamese Modern Classics',youtubeId:'',thumbnail:''},
  {id:4,title:'Barixa',artist:'Zubeen Garg',year:'—',category:'Midnight Melodies',youtubeId:'',thumbnail:''},
  {id:5,title:'Anamika',artist:'Zubeen Garg',year:'—',category:'Borgeet, Lokgeet & Bhakti',youtubeId:'',thumbnail:''}
];

const ROTATIONS = [
  {start:'00:00',end:'08:00',title:'Borgeet, Lokgeet & Bhakti',assamese:'ভক্তি, গীতিকবিতা আৰু লোকগীত',desc:'Quiet, rich, soulful. Saturdays before sunrise, folk as the light comes.',cat:'Borgeet, Lokgeet & Bhakti'},
  {start:'08:00',end:'11:00',title:'Bihu & High Energy',assamese:'বিহু আৰু উচ্ছল গীত',desc:'Dhol, pepa, rogori. The morning belongs to the fields.',cat:'Bihu & High Energy'},
  {start:'11:00',end:'17:00',title:'Assamese Modern Classics',assamese:'অসমীয়া আধুনিক ক্লাছিক',desc:'Anamika, Mayabini, Maya — the songs that raised a generation.',cat:'Assamese Modern Classics'},
  {start:'17:00',end:'21:00',title:'Bollywood Nostalgia',assamese:'বলিউড নষ্টালজিয়া',desc:'The playback years, when the rest of the country learned his voice.',cat:'Bollywood Nostalgia'},
  {start:'21:00',end:'00:00',title:'Midnight Melodies',assamese:'মাজনিশাৰ সুৰ',desc:'Slow, soulful, unhurried. For the ones still awake.',cat:'Midnight Melodies'}
];

function getRotation(date=new Date()) {
  const mins=date.getHours()*60+date.getMinutes();
  const index=mins<480?0:mins<660?1:mins<1020?2:mins<1260?3:4;
  return ROTATIONS[index];
}
function formatClock(d){return d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}).replace(/^0/,'');}
function formatRemaining(d){
  const end = d.getHours()*60+d.getMinutes();
  const r = (getRotation(d).end==='00:00'?1440:parseInt(getRotation(d).end.slice(0,2))*60)-end;
  return `${Math.max(0,r)}m left`;
}
function youtubeThumb(id){return id?`https://i.ytimg.com/vi/${id}/hqdefault.jpg`:'';}

function App(){
  const [songs,setSongs]=useState(()=>{try{return JSON.parse(localStorage.getItem('zubeen_songs'))||DEFAULT_SONGS}catch{return DEFAULT_SONGS}});
  const [current,setCurrent]=useState(()=>{try{return (JSON.parse(localStorage.getItem('zubeen_songs'))||DEFAULT_SONGS)[0]}catch{return DEFAULT_SONGS[0]}});
  const [playing,setPlaying]=useState(false);
  const [clock,setClock]=useState(new Date());
  const [bg,setBg]=useState(true);
  const [screenOn,setScreenOn]=useState(false);
  const [volume,setVolume]=useState(.85);
  const [query,setQuery]=useState('');
  const [radio,setRadio]=useState(true);
  const [notice,setNotice]=useState('');
  const playerRef=useRef(null);
  const playerReady=useRef(false);

  const rotation=getRotation(clock);
  const filtered=useMemo(()=>songs.filter(s=>`${s.title} ${s.artist}`.toLowerCase().includes(query.toLowerCase())),[songs,query]);
  const rotationSongs=songs.filter(s=>s.category===rotation.cat);
  const currentIndex=Math.max(0,songs.findIndex(s=>s.id===current.id));

  useEffect(()=>{const t=setInterval(()=>setClock(new Date()),1000);return()=>clearInterval(t)},[]);
  useEffect(()=>{localStorage.setItem('zubeen_songs',JSON.stringify(songs))},[songs]);

  useEffect(()=>{
    window.onYouTubeIframeAPIReady=()=>{
      playerRef.current=new window.YT.Player('yt-player',{videoId:current.youtubeId||'',playerVars:{autoplay:0,controls:1,rel:0,playsinline:1,modestbranding:1},events:{onReady:()=>{playerReady.current=true},onStateChange:(e)=>{if(e.data===1)setPlaying(true);if(e.data===2)setPlaying(false);if(e.data===0)nextSong()}}});
    };
    if(!document.getElementById('youtube-iframe-api')){const s=document.createElement('script');s.id='youtube-iframe-api';s.src='https://www.youtube.com/iframe_api';document.body.appendChild(s)} else if(window.YT?.Player) window.onYouTubeIframeAPIReady();
    return()=>{window.onYouTubeIframeAPIReady=null};
  },[]);

  useEffect(()=>{
    if(!current.youtubeId){setPlaying(false);return}
    const load=()=>{if(playerRef.current?.loadVideoById){playerRef.current.loadVideoById(current.youtubeId); if(!playing)playerRef.current.pauseVideo()}};
    if(playerReady.current)load(); else setTimeout(load,300);
  },[current.youtubeId]); // eslint-disable-line react-hooks/exhaustive-deps

  function playSong(song){
    setCurrent(song);setNotice('');
    if(!song.youtubeId){setPlaying(false);setNotice('Ei song-r YouTube Video ID etiyaloi add kora nai. Admin → Edit Catalog-ot ID add kora.');return}
    setTimeout(()=>{if(playerRef.current?.loadVideoById)playerRef.current.loadVideoById(song.youtubeId);},100);
  }
  function togglePlay(){
    if(!current.youtubeId){setNotice('Current song-r YouTube Video ID nai.');return}
    if(!playerRef.current){setNotice('YouTube player loading...');return}
    if(playing)playerRef.current.pauseVideo();else playerRef.current.playVideo();
  }
  function nextSong(){
    const list=rotationSongs.length?rotationSongs:songs;
    if(!list.length)return;
    const idx=list.findIndex(s=>s.id===current.id);playSong(list[(idx+1+list.length)%list.length]);
  }
  function prevSong(){const idx=songs.findIndex(s=>s.id===current.id);playSong(songs[(idx-1+songs.length)%songs.length]);}
  function toggleRadio(){setRadio(v=>!v);setNotice(!radio?'Auto radio ON — song end hole next song play hobo.':'Auto radio OFF.');}

  return <div className={`app ${bg?'cinematic':''} ${screenOn?'screen-on':''}`}>
    <div className="ambient one"/><div className="ambient two"/>
    <header className="topbar">
      <div><div className="clock">{formatClock(clock)}</div><div className="date">{clock.toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).toUpperCase()}</div></div>
      <div className="onair"><i/> ON AIR • ZUBEEN RADIO</div>
      <nav><a href="/">zubeengarg.xyz</a><a href="/schedule.html">Schedule</a><a href="/admin.html">Admin</a></nav>
    </header>

    <main>
      <div className="listen">◉ {Math.max(1,Math.round(349 + songs.length*7))} LISTENING</div>
      <section className="hero">
        <div className="signal">⌁</div>
        <h1>জুবিন দা ৰেডিঅ’</h1><div className="subtitle">ZUBEEN RADIO</div>
        <div className="player-card">
          <div className="art-side">
            <div className="cover">{current.thumbnail||youtubeThumb(current.youtubeId)?<img src={current.thumbnail||youtubeThumb(current.youtubeId)} alt=""/>:<div className="cover-placeholder">ZG</div>}</div>
            <div className="mini-onair">● ON AIR<br/><span>{rotation.title}</span></div>
          </div>
          <div className="player-info">
            <div className="label">NOW PLAYING <span>⌄</span></div>
            <h2>{current.title}</h2>
            <p>{current.artist} <b>•</b> {current.year}</p>
            <div className="yt-wrap"><div id="yt-player"/></div>
            <div className="fake-controls">
              <button onClick={prevSong}>◀</button><button className="main-play" onClick={togglePlay}>{playing?'Ⅱ':'▶'}</button><button onClick={nextSong}>▶</button>
              <div className="fake-wave">▁▂▃▅▆▇▆▃▅▂▁▃▆▅▃</div>
              <input aria-label="volume" type="range" min="0" max="1" step=".01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/>
            </div>
            <div className="player-actions"><button className={bg?'active':''} onClick={()=>setBg(v=>!v)}>◒ BACKGROUND</button><button className={screenOn?'active':''} onClick={()=>setScreenOn(v=>!v)}>◉ SCREEN ON</button><span>SPOTIFY ↗ &nbsp; YT MUSIC ↗</span></div>
          </div>
        </div>
      </section>

      {notice&&<div className="notice">{notice}</div>}
      <section className="radio-strip"><div><strong>{rotation.title}</strong><span> • ON AIR</span></div><div>{formatRemaining(clock)}</div><button onClick={toggleRadio}>{radio?'AUTO RADIO ON':'AUTO RADIO OFF'}</button></section>
      <section className="below">
        <div><div className="section-title"><h2>Up next</h2><span>{rotationSongs.length||songs.length} tracks</span></div><div className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search songs"/></div>{(filtered.length?filtered:songs).slice(0,7).map((s,i)=><div className={`track ${s.id===current.id?'current':''}`} key={s.id} onClick={()=>playSong(s)}><span className="num">{String(i+1).padStart(2,'0')}</span><span className="track-name"><b>{s.title}</b><small>{s.artist} • {s.year}</small></span><span>{s.id===current.id?'● ON AIR':'▶'}</span></div>)}</div>
        <div className="schedule-mini"><div className="section-title"><h2>Today</h2><a href="/schedule.html">Full schedule →</a></div>{ROTATIONS.map(r=><div className={`schedule-row ${r.title===rotation.title?'active':''}`} key={r.title}><span>{r.start} – {r.end}</span><b>{r.title}</b></div>)}<p>Five rotations a day, set by the clock in Guwahati.</p></div>
      </section>
    </main>
    <footer>THERE IS NOTHING TO CLICK HERE. YOU CAN’T PICK A SONG OR SKIP ONE — THE CLOCK IN GUWAHATI DECIDES WHAT EVERYONE IS HEARING.</footer>
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);
