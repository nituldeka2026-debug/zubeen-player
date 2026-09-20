const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 10000);
const API_KEY = process.env.YOUTUBE_API_KEY || '';
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');

const ROTATIONS = [
  ['Prabhat — Zubeen Morning','Zubeen Garg borgeet lokgeet bhakti Assamese songs'],
  ['Bihu Beats','Zubeen Garg Bihu Assamese songs'],
  ['Zubeen Classics','Zubeen Garg Assamese modern songs'],
  ['Evening Memories','Zubeen Garg Bollywood Hindi songs'],
  ['Midnight Zubeen','Zubeen Garg romantic Assamese songs']
];

// These are real YouTube videos from Zubeen Garg's Official Artist Channel found during setup.
// They make the radio playable immediately even before a YouTube API key is configured.
const FALLBACKS = [
  { id:'seed-mayabini', title:'Mayabini', artist:'Zubeen Garg', year:'2006', category:'Assamese Modern Classics', youtubeId:'o2uNk9lh5RU', thumbnail:'https://i.ytimg.com/vi/o2uNk9lh5RU/hqdefault.jpg', enabled:true, source:'official-youtube-fallback' },
  { id:'seed-monole', title:'Monole Ubhoti Ahe', artist:'Zubeen Garg', year:'2025', category:'Assamese Modern Classics', youtubeId:'BD-WtD3hU3M', thumbnail:'https://i.ytimg.com/vi/BD-WtD3hU3M/hqdefault.jpg', enabled:true, source:'official-youtube-fallback' },
  { id:'seed-bhed', title:'Mur Monot Bhed Bhav Nai', artist:'Zubeen Garg', year:'2021', category:'Assamese Modern Classics', youtubeId:'JMj0StLwyRc', thumbnail:'https://i.ytimg.com/vi/JMj0StLwyRc/hqdefault.jpg', enabled:true, source:'official-youtube-fallback' }
];

function ensureData(){
  if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true});
  if(!fs.existsSync(CATALOG_FILE)) fs.writeFileSync(CATALOG_FILE, JSON.stringify(FALLBACKS,null,2));
}
function readCatalog(){
  ensureData();
  try { return JSON.parse(fs.readFileSync(CATALOG_FILE,'utf8')) || []; }
  catch { return FALLBACKS.slice(); }
}
function writeCatalog(items){ ensureData(); fs.writeFileSync(CATALOG_FILE, JSON.stringify(items,null,2)); }
function json(res,status,data){ const body=JSON.stringify(data); res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(body); }
function body(req){ return new Promise((resolve,reject)=>{ let b=''; req.on('data',c=>{b+=c;if(b.length>2e6) req.destroy();}); req.on('end',()=>{try{resolve(b?JSON.parse(b):{});}catch(e){reject(e);}}); req.on('error',reject);}); }
function clean(v,n=300){return String(v??'').trim().slice(0,n);}
function rotationForNow(){
  const d=new Date(); const m=d.getHours()*60+d.getMinutes();
  return ROTATIONS[m<480?0:m<660?1:m<1020?2:m<1260?3:4][0];
}

function parseDuration(iso){
  const m=String(iso||'').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if(!m) return 0;
  return Number(m[1]||0)*3600+Number(m[2]||0)*60+Number(m[3]||0);
}

async function youtubeSearch(q){
  if(!API_KEY) return [];
  const u=new URL('https://www.googleapis.com/youtube/v3/search');
  u.search=new URLSearchParams({part:'snippet',q,type:'video',maxResults:'15',regionCode:'IN',videoEmbeddable:'true',videoSyndicated:'true',key:API_KEY});
  const r=await fetch(u); const d=await r.json();
  if(!r.ok) throw new Error(d.error?.message||'YouTube API search failed');
  const ids=(d.items||[]).map(x=>x.id?.videoId).filter(Boolean);
  if(!ids.length) return [];
  const v=new URL('https://www.googleapis.com/youtube/v3/videos');
  v.search=new URLSearchParams({part:'snippet,status,contentDetails',id:ids.join(','),key:API_KEY});
  const vr=await fetch(v); const vd=await vr.json();
  if(!vr.ok) throw new Error(vd.error?.message||'YouTube API details failed');
  return (vd.items||[]).filter(x=>x.status?.privacyStatus==='public' && x.status?.embeddable!==false).map(x=>({
    id:x.id,title:x.snippet?.title||'Zubeen Garg',artist:x.snippet?.channelTitle||'Zubeen Garg',
    year:(x.snippet?.publishedAt||'').slice(0,4)||'—',duration:parseDuration(x.contentDetails?.duration),thumbnail:x.snippet?.thumbnails?.high?.url||x.snippet?.thumbnails?.medium?.url||`https://i.ytimg.com/vi/${x.id}/hqdefault.jpg`
  }));
}

async function autoSync(category){
  let catalog=readCatalog();
  let current=catalog.filter(s=>s.enabled!==false && s.category===category && s.youtubeId);
  if(current.length>=3) return {items:current,added:0,api:false};
  const q=(ROTATIONS.find(x=>x[0]===category)||[])[1];
  if(API_KEY && q){
    try{
      const results=await youtubeSearch(q);
      const ids=new Set(catalog.map(s=>s.youtubeId).filter(Boolean));
      const selected=results.filter(x=>!ids.has(x.id)).filter(x=>/zubeen|জুবিন/i.test(`${x.title} ${x.artist}`)).slice(0,8);
      for(const x of selected){
        catalog.push({id:crypto.randomUUID(),title:x.title,artist:x.artist,year:x.year,category,youtubeId:x.id,duration:x.duration||0,thumbnail:x.thumbnail,enabled:true,source:'youtube-api'});
        ids.add(x.id);
      }
      if(selected.length) writeCatalog(catalog);
      current=catalog.filter(s=>s.enabled!==false && s.category===category && s.youtubeId);
      if(current.length) return {items:current,added:selected.length,api:true};
    }catch(e){ console.error('YouTube sync:',e.message); }
  }
  // Always leave a playable fallback in the current rotation.
  const fallback=FALLBACKS.map(x=>({...x,id:`${x.id}-${category.replace(/\W/g,'').toLowerCase()}`,category}));
  const ids=new Set(catalog.map(s=>s.youtubeId));
  for(const x of fallback){ if(!ids.has(x.youtubeId)){catalog.push(x);ids.add(x.youtubeId);} }
  // Re-label existing fallback songs into this category so every time block remains playable.
  for(const x of catalog){ if(FALLBACKS.some(f=>f.youtubeId===x.youtubeId) && x.source==='official-youtube-fallback' && x.category!==category) x.category=category; }
  writeCatalog(catalog);
  return {items:catalog.filter(s=>s.enabled!==false && s.category===category && s.youtubeId),added:0,api:false};
}

const listeners=new Map();
// Global station state: every visitor receives the same song and playback position.
const station = new Map();
const history = new Map();
function pushHistory(category, song, duration){
  if(!song) return;
  const key=stationKey(category);
  const list=history.get(key)||[];
  list.unshift({...song,duration:Number(duration||song.duration||0),playedAt:Date.now()});
  history.set(key,list.slice(0,20));
}
function stationKey(category){ return category || rotationForNow(); }
function stationItems(category){
  const key=stationKey(category);
  return readCatalog().filter(s=>s.enabled!==false && s.category===key && (s.youtubeId||s.audioUrl));
}
function getStation(category, items){
  const key=stationKey(category);
  items=items||stationItems(key);
  let st=station.get(key);
  if(!st || !items.some(x=>x.id===st.songId)){
    const first=items[0];
    st={songId:first?.id||null,startedAt:Date.now(),revision:1,duration:Number(first?.duration||0)};
    station.set(key,st);
    if(first) pushHistory(key,first,st.duration);
  }
  let song=items.find(x=>x.id===st.songId) || items[0];
  if(song && song.id!==st.songId){
    st.songId=song.id; st.startedAt=Date.now(); st.revision++; st.duration=Number(song.duration||0);
  }
  if(song && !st.duration && song.duration) st.duration=Number(song.duration);
  let elapsed=Math.max(0,(Date.now()-st.startedAt)/1000);
  // Server owns the clock. When the known duration is reached, advance automatically.
  if(song && st.duration>0 && elapsed>=st.duration+0.25 && items.length>1){
    const idx=Math.max(0,items.findIndex(x=>x.id===song.id));
    const next=items[(idx+1)%items.length];
    st={songId:next.id,startedAt:Date.now(),revision:(st.revision||0)+1,duration:Number(next.duration||0)};
    station.set(key,st); pushHistory(key,next,st.duration); song=next; elapsed=0;
  }
  return {category:key,song,startedAt:st.startedAt,serverNow:Date.now(),position:elapsed,duration:Number(st.duration||song?.duration||0),revision:st.revision};
}
function setStationDuration(category, songId, duration){
  const key=stationKey(category); const st=station.get(key);
  const sec=Math.floor(Number(duration)||0);
  if(!st || st.songId!==songId || sec<1) return null;
  st.duration=sec; station.set(key,st);
  return getStation(key,stationItems(key));
}
function advanceStation(category){
  const key=stationKey(category), items=stationItems(key);
  if(!items.length) return null;
  const current=getStation(key,items);
  const idx=Math.max(0,items.findIndex(x=>x.id===current.song.id));
  const next=items[(idx+1)%items.length];
  const st={songId:next.id,startedAt:Date.now(),revision:(current.revision||0)+1,duration:Number(next.duration||0)};
  station.set(key,st); pushHistory(key,next,st.duration);
  return getStation(key,items);
}
setInterval(()=>{const now=Date.now();for(const [id,t] of listeners)if(now-t>45000)listeners.delete(id);},15000).unref();

function safeFile(p){
  const decoded=decodeURIComponent(p.split('?')[0]);
  const normalized=path.normalize(decoded).replace(/^([.][.][/\\])+/, '');
  return path.join(ROOT, normalized==='/'?'index.html':normalized.replace(/^[/\\]+/,''));
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};

const server=http.createServer(async (req,res)=>{
  try{
    const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);
    if(req.method==='GET' && u.pathname==='/api/health') return json(res,200,{ok:true,youtubeConfigured:Boolean(API_KEY),listeners:listeners.size,catalogCount:readCatalog().length});
    if(req.method==='GET' && u.pathname==='/api/listeners'){const now=Date.now();for(const [id,t] of listeners)if(now-t>45000)listeners.delete(id);return json(res,200,{listeners:listeners.size});}
    if(req.method==='POST' && u.pathname==='/api/listeners/heartbeat'){
      const b=await body(req); const sid=clean(b.sessionId,120)||crypto.randomUUID(); listeners.set(sid,Date.now()); return json(res,200,{sessionId:sid,listeners:listeners.size});
    }
    if(req.method==='GET' && u.pathname==='/api/songs'){
      const cat=clean(u.searchParams.get('category'),100); const all=readCatalog().filter(s=>s.enabled!==false && (s.youtubeId||s.audioUrl));
      return json(res,200,{items:cat?all.filter(s=>s.category===cat):all});
    }
    if(req.method==='POST' && u.pathname==='/api/radio/bootstrap'){
      const b=await body(req); const category=clean(b.category,100)||rotationForNow(); const result=await autoSync(category); return json(res,200,result);
    }
    if(req.method==='GET' && u.pathname==='/api/youtube/search'){
      const q=clean(u.searchParams.get('q'),180); if(!q)return json(res,200,{items:[]});
      if(!API_KEY)return json(res,503,{error:'YOUTUBE_API_KEY is not configured on Render.'});
      return json(res,200,{items:await youtubeSearch(q)});
    }
    if(req.method==='GET' && u.pathname==='/api/radio/history'){
      const cat=clean(u.searchParams.get('category'),100)||rotationForNow();
      const items=(history.get(cat)||[]).filter(x=>x);
      return json(res,200,{items:items.slice(0,20)});
    }
    if(req.method==='GET' && u.pathname==='/api/radio/state'){
      const cat=clean(u.searchParams.get('category'),100)||rotationForNow();
      const items=readCatalog().filter(s=>s.enabled!==false && s.category===cat && (s.youtubeId||s.audioUrl));
      if(!items.length) return json(res,404,{error:'No playable songs in this rotation'});
      return json(res,200,getStation(cat,items));
    }
    if(req.method==='POST' && u.pathname==='/api/radio/advance') return json(res,403,{error:'Station controls are locked. Songs change automatically for everyone.'});
    if(req.method==='POST' && u.pathname==='/api/radio/previous') return json(res,403,{error:'Station controls are locked. Songs change automatically for everyone.'});
    if(req.method==='POST' && u.pathname==='/api/radio/report-duration'){
      const b=await body(req); const cat=clean(b.category,100)||rotationForNow();
      const state=setStationDuration(cat,clean(b.songId,200),b.duration);
      if(!state) return json(res,409,{error:'Station state changed; duration ignored'});
      return json(res,200,state);
    }
    if(req.method==='GET' && u.pathname==='/api/admin/songs') return json(res,200,{items:readCatalog()});
    if(req.method==='POST' && u.pathname==='/api/admin/songs'){
      const b=await body(req); const title=clean(b.title,180), youtubeId=clean(b.youtubeId,40), audioUrl=clean(b.audioUrl,1000);
      if(!title || (!youtubeId && !audioUrl)) return json(res,400,{error:'title and youtubeId/audioUrl required'});
      const catalog=readCatalog(); if(youtubeId && catalog.some(s=>s.youtubeId===youtubeId)) return json(res,409,{error:'Already in catalog'});
      const song={id:crypto.randomUUID(),title,artist:clean(b.artist,120)||'Zubeen Garg',year:clean(b.year,20)||'—',category:clean(b.category,100)||'Assamese Modern Classics',youtubeId,audioUrl,thumbnail:clean(b.thumbnail,500),enabled:true,source:'admin'}; catalog.push(song);writeCatalog(catalog);return json(res,200,{song});
    }

    let file=safeFile(u.pathname);
    if(!fs.existsSync(file)||fs.statSync(file).isDirectory()) file=path.join(ROOT,'index.html');
    const ext=path.extname(file).toLowerCase(); res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream'}); fs.createReadStream(file).pipe(res);
  }catch(e){ console.error(e); json(res,500,{error:e.message||'Server error'}); }
});

ensureData();
server.listen(PORT,()=>console.log(`Zubeen Radio 3.0 listening on ${PORT} | YouTube API: ${API_KEY?'ON':'OFF (fallback songs ON)'}`));
