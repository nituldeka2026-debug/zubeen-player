const ROTATIONS=[
 {s:0,e:480,name:'Borgeet, Lokgeet & Bhakti',as:'ভক্তি, লোকগীত আৰু বৰগীত',desc:'Quiet, soulful songs before sunrise.'},
 {s:480,e:660,name:'Bihu & High Energy',as:'বিহু আৰু উচ্ছল গীত',desc:'Dhol, pepa and high-energy Assamese songs.'},
 {s:660,e:1020,name:'Assamese Modern Classics',as:'অসমীয়া আধুনিক ক্লাছিক',desc:'Songs that raised a generation.'},
 {s:1020,e:1260,name:'Bollywood Nostalgia',as:'বলিউড নষ্টালজিয়া',desc:'The playback years and Hindi favourites.'},
 {s:1260,e:1440,name:'Midnight Melodies',as:'মাজনিশাৰ সুৰ',desc:'Slow, soulful and unhurried.'}
];
let songs=[], currentIndex=0, current=null, player=null, playerReady=false, playing=false, ytApiFailed=false, stationState=null, stationPoll=null, stationApplying=false, session=localStorage.getItem('zubeen_sid')||crypto.randomUUID();
localStorage.setItem('zubeen_sid',session);
const $=id=>document.getElementById(id);
function now(){const d=new Date(),m=d.getHours()*60+d.getMinutes();return {d,m,r:ROTATIONS.find(r=>m>=r.s&&m<r.e)||ROTATIONS[4]};}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmt(sec){sec=Math.max(0,Math.floor(Number(sec)||0));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;}
function notice(t,ok=false){$('notice').textContent=t;$('notice').className='notice '+(ok?'ok':'');}
function tick(){const x=now(),d=x.d;$('clock').textContent=d.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'});$('date').textContent=d.toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'short',year:'numeric'});$('rotation').textContent=x.r.name;const left=Math.max(0,x.r.e-x.m);$('remaining').textContent=`${left} MIN LEFT`;renderSchedule(x.r);}
function renderSchedule(active){$('schedule').innerHTML=ROTATIONS.map(r=>`<div class="srow ${r.name===active.name?'active':''}"><b>${r.s/60|0}:00–${r.e===1440?'00:00':String(r.e/60|0).padStart(2,'0')}:00</b><span>${esc(r.name)}<small>${esc(r.as)}</small></span>${r.name===active.name?'<i>● ON AIR</i>':''}</div>`).join('');}
async function bootstrap(){const cat=now().r.name;notice('Automatic song search running…');try{const r=await fetch('/api/radio/bootstrap',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({category:cat})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Radio server error');songs=d.items||[];songs=songs.filter(s=>s.youtubeId||s.audioUrl);$('count').textContent=`${songs.length} tracks`;if(!songs.length)throw new Error('No playable songs returned');currentIndex=0;select(0,false);renderTracks();notice(d.api?'YouTube automatic discovery active.':'Radio ready — built-in YouTube fallback active.',true);}catch(e){notice(e.message||'Radio load failed');}}
function renderTracks(){const cat=now().r.name;const list=songs.filter(s=>s.category===cat);const use=list.length?list:songs;$('tracks').innerHTML=use.slice(0,10).map((s,i)=>`<div class="track ${s.id===current?.id?'current':''}" data-id="${esc(s.id)}"><span>${String(i+1).padStart(2,'0')}</span><img src="${esc(s.thumbnail||'https://i.ytimg.com/vi/'+s.youtubeId+'/hqdefault.jpg')}" onerror="this.style.display='none'"><b>${esc(s.title)}<small>${esc(s.artist||'Zubeen Garg')} • ${esc(s.year||'—')}</small></b><em>${s.id===current?.id?'● ON AIR':'▶'}</em></div>`).join('');document.querySelectorAll('.track').forEach(el=>el.onclick=()=>select(songs.findIndex(s=>s.id===el.dataset.id),false));}
function showDirectEmbed(id,autoplay=false,startSeconds=0){
  const box=$('yt');
  if(!id){box.innerHTML='';return;}
  const src=`https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=${autoplay?1:0}&start=${Math.floor(Math.max(0,startSeconds))}&controls=1&rel=0&playsinline=1&modestbranding=1&origin=${encodeURIComponent(location.origin)}`;
  box.innerHTML=`<iframe id="ytDirect" title="Zubeen Radio YouTube Player" src="${src}" style="width:100%;height:100%;border:0;display:block" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  playerReady=false; playing=autoplay; $('play').textContent=autoplay?'Ⅱ':'▶';
}
function applySong(song, position=0, autoPlay=false){
  if(!song) return;
  const i=songs.findIndex(s=>s.id===song.id); if(i>=0) currentIndex=i;
  current=song;
  $('title').textContent=current.title;$('artist').textContent=current.artist||'Zubeen Garg';
  $('meta').textContent=`${current.category||'Radio'} • ${current.year||'—'} • ${current.source==='youtube-api'?'YouTube API':'YouTube'}`;
  $('cover').style.backgroundImage=current.thumbnail?`url("${current.thumbnail}")`:'';$('cover').classList.toggle('has',!!current.thumbnail);$('cover').textContent=current.thumbnail?'':'ZG';
  renderTracks();
  if(current.audioUrl){notice('Direct audio source selected.',true);return;}
  const target=Math.max(0,Number(position)||0);
  if(playerReady&&player&&current.youtubeId){
    player.loadVideoById({videoId:current.youtubeId,startSeconds:target});
    if(!autoPlay) player.pauseVideo();
    else player.playVideo();
    return;
  }
  if(ytApiFailed||!window.YT){showDirectEmbed(current.youtubeId,autoPlay,target);if(autoPlay)notice('Playing on YouTube.');}
}
function select(i,auto){
  if(!songs.length)return;i=(i+songs.length)%songs.length;currentIndex=i;
  // Selection in radio mode is global. Do not let one browser create a private playlist.
  const category=now().r.name;
  fetch('/api/radio/advance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({category,songId:songs[i]?.id})})
    .then(r=>r.json()).then(st=>{if(st.song){stationState=st;applySong(st.song,0,auto);}}).catch(()=>applySong(songs[i],0,auto));
}
function applyStationState(st,autoPlay=false){
  if(!st?.song)return;
  stationState=st;
  applySong(st.song,Number(st.position)||0,autoPlay);
}
async function syncStation(autoPlay=false){
  const category=now().r.name;
  try{
    const r=await fetch('/api/radio/state?category='+encodeURIComponent(category),{cache:'no-store'}); const st=await r.json();
    if(!r.ok) throw new Error(st.error||'Station state unavailable');
    const changed=!stationState || stationState.song?.id!==st.song?.id || Math.abs((Number(st.position)||0)-(Number(stationState.position)||0))>8;
    if(changed) applyStationState(st,autoPlay);
    else stationState=st;
  }catch(e){ if(!stationState && songs[0]) applySong(songs[0],0,autoPlay); }
}
function startStationSync(){
  clearInterval(stationPoll);
  stationPoll=setInterval(()=>syncStation(false),5000);
}
async function next(){
  const category=now().r.name;
  try{const r=await fetch('/api/radio/advance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({category,songId:current?.id||''})});const st=await r.json();if(st.song){applyStationState(st,true);return;}}catch{}
  if(songs.length) applySong(songs[(currentIndex+1)%songs.length],0,true);
}
async function prev(){
  const category=now().r.name;
  try{const r=await fetch('/api/radio/previous',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({category,songId:current?.id||''})});const st=await r.json();if(st.song){applyStationState(st,false);return;}}catch{}
  if(songs.length) applySong(songs[(currentIndex-1+songs.length)%songs.length],0,false);
}
function toggle(){
  if(playerReady&&player){if(playing)player.pauseVideo();else {player.playVideo();notice('Playing • click again to pause',true);}return;}
  const frame=document.getElementById('ytDirect');
  if(frame){
    const cmd=playing?'pauseVideo':'playVideo';
    frame.contentWindow.postMessage(JSON.stringify({event:'command',func:cmd,args:[]}), 'https://www.youtube.com');
    playing=!playing;$('play').textContent=playing?'Ⅱ':'▶';notice(playing?'Playing on YouTube.':'Paused.',true);return;
  }
  notice('YouTube player loading…');
}
function onYTReady(){
  try{
    player=new YT.Player('yt',{width:'100%',height:'100%',videoId:'',playerVars:{controls:1,rel:0,playsinline:1,origin:location.origin},events:{onReady:()=>{playerReady=true;if(current?.youtubeId)player.cueVideoById(current.youtubeId);},onStateChange:e=>{if(e.data===YT.PlayerState.PLAYING){playing=true;$('play').textContent='Ⅱ';$('wave').classList.add('live');}else if(e.data===YT.PlayerState.PAUSED||e.data===YT.PlayerState.CUED){playing=false;$('play').textContent='▶';$('wave').classList.remove('live');}else if(e.data===YT.PlayerState.ENDED){playing=false;next();}},onError:e=>{playing=false;$('play').textContent='▶';notice(`YouTube video cannot play here (error ${e.data}). Trying next song…`);setTimeout(next,700);}}});
  }catch(e){console.error('YouTube IFrame API init failed',e);ytApiFailed=true;if(current?.youtubeId)showDirectEmbed(current.youtubeId,false);}
}
window.onYouTubeIframeAPIReady=onYTReady;
function loadYTApi(){
  if(window.YT?.Player){onYTReady();return;}
  const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.async=true;s.onerror=()=>{ytApiFailed=true;if(current?.youtubeId)showDirectEmbed(current.youtubeId,false);notice('YouTube API could not load. Direct YouTube player enabled.',true);};document.head.appendChild(s);
  setTimeout(()=>{if(!playerReady&&!window.YT?.Player){ytApiFailed=true;if(current?.youtubeId)showDirectEmbed(current.youtubeId,false);notice('YouTube API is unavailable here. Direct YouTube player enabled.',true);}},7000);
}
$('play').onclick=toggle;$('next').onclick=next;$('prev').onclick=prev;$('vol').oninput=e=>{if(player?.setVolume)player.setVolume(Number(e.target.value));};$('bgBtn').onclick=()=>{document.body.classList.toggle('no-bg');};
setInterval(tick,1000);tick();
setInterval(async()=>{try{const r=await fetch('/api/listeners/heartbeat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:session})});const d=await r.json();$('listeners').textContent=d.listeners||1;}catch{}},20000);
(async()=>{await bootstrap();await syncStation(false);startStationSync();loadYTApi();if(ytApiFailed&&current?.youtubeId)showDirectEmbed(current.youtubeId,false,Number(stationState?.position)||0);})();
