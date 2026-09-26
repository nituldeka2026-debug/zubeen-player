const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 10000);
const API_KEY = process.env.YOUTUBE_API_KEY || '';
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');
const SCHEDULE_FILE = path.join(DATA_DIR, 'schedule.json');

const ROTATIONS = [
  ['Prabhat — Zubeen Morning','Zubeen Garg Assamese morning borgeet lokgeet bhakti songs'],
  ['Bihu Beats','Zubeen Garg Bihu Assamese songs'],
  ['Zubeen Classics','Zubeen Garg classic Assamese songs'],
  ['Evening Memories','Zubeen Garg Assamese Hindi songs'],
  ['Midnight Zubeen','Zubeen Garg romantic Assamese songs']
];
const DEFAULT_SCHEDULE = ROTATIONS.map((x,i)=>({id:`program-${i+1}`,name:x[0],query:x[1],start:i===0?'00:00':i===1?'05:00':i===2?'09:00':i===3?'17:00':'22:00',end:i===0?'05:00':i===1?'09:00':i===2?'17:00':i===3?'22:00':'00:00',enabled:true}));
const FALLBACKS = [
  { id:'seed-mayabini', title:'Mayabini', artist:'Zubeen Garg', year:'2006', category:'Zubeen Classics', youtubeId:'o2uNk9lh5RU', thumbnail:'https://i.ytimg.com/vi/o2uNk9lh5RU/hqdefault.jpg', enabled:true, source:'fallback' },
  { id:'seed-monole', title:'Monole Ubhoti Ahe', artist:'Zubeen Garg', year:'2025', category:'Zubeen Classics', youtubeId:'BD-WtD3hU3M', thumbnail:'https://i.ytimg.com/vi/BD-WtD3hU3M/hqdefault.jpg', enabled:true, source:'fallback' },
  { id:'seed-bhed', title:'Mur Monot Bhed Bhav Nai', artist:'Zubeen Garg', year:'2021', category:'Zubeen Classics', youtubeId:'JMj0StLwyRc', thumbnail:'https://i.ytimg.com/vi/JMj0StLwyRc/hqdefault.jpg', enabled:true, source:'fallback' }
];

function ensureData(){
  if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true});
  if(!fs.existsSync(CATALOG_FILE)) fs.writeFileSync(CATALOG_FILE,JSON.stringify(FALLBACKS,null,2));
  if(!fs.existsSync(SCHEDULE_FILE)) fs.writeFileSync(SCHEDULE_FILE,JSON.stringify(DEFAULT_SCHEDULE,null,2));
}
function readJson(file,fallback){ensureData();try{return JSON.parse(fs.readFileSync(file,'utf8'))||fallback}catch{return fallback}}
function writeJson(file,data){ensureData();fs.writeFileSync(file,JSON.stringify(data,null,2))}
function readCatalog(){return readJson(CATALOG_FILE,FALLBACKS)}
function writeCatalog(items){writeJson(CATALOG_FILE,items)}
function readSchedule(){return readJson(SCHEDULE_FILE,DEFAULT_SCHEDULE)}
function writeSchedule(items){writeJson(SCHEDULE_FILE,items)}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
function body(req){return new Promise((resolve,reject)=>{let b='';req.on('data',c=>{b+=c;if(b.length>2e6) req.destroy()});req.on('end',()=>{try{resolve(b?JSON.parse(b):{})}catch(e){reject(e)}});req.on('error',reject)})}
function clean(v,n=300){return String(v??'').trim().slice(0,n)}
function minutes(t){const m=String(t||'00:00').match(/^(\d{1,2}):(\d{2})$/);return m?Math.min(1439,Number(m[1])*60+Number(m[2])):0}
function rotationForNow(){const m=new Date().getHours()*60+new Date().getMinutes();const p=readSchedule().find(x=>{const s=minutes(x.start),e=minutes(x.end);return s<e?m>=s&&m<e:m>=s||m<e});return p?.name||'Midnight Zubeen'}
function stationKey(category){return category||rotationForNow()}
function parseDuration(iso){const m=String(iso||'').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);return m?Number(m[1]||0)*3600+Number(m[2]||0)*60+Number(m[3]||0):0}

async function youtubeSearch(q){
  if(!API_KEY)return [];
  const u=new URL('https://www.googleapis.com/youtube/v3/search');
  u.search=new URLSearchParams({part:'snippet',q,type:'video',maxResults:'25',regionCode:'IN',videoEmbeddable:'true',videoSyndicated:'true',key:API_KEY});
  const r=await fetch(u),d=await r.json();if(!r.ok)throw new Error(d.error?.message||'YouTube API search failed');
  const ids=(d.items||[]).map(x=>x.id?.videoId).filter(Boolean);if(!ids.length)return [];
  const v=new URL('https://www.googleapis.com/youtube/v3/videos');v.search=new URLSearchParams({part:'snippet,status,contentDetails',id:ids.join(','),key:API_KEY});
  const vr=await fetch(v),vd=await vr.json();if(!vr.ok)throw new Error(vd.error?.message||'YouTube API details failed');
  return (vd.items||[]).filter(x=>x.status?.privacyStatus==='public'&&x.status?.embeddable!==false).map(x=>({id:x.id,title:x.snippet?.title||'Zubeen Garg',artist:x.snippet?.channelTitle||'Zubeen Garg',year:(x.snippet?.publishedAt||'').slice(0,4)||'—',duration:parseDuration(x.contentDetails?.duration),thumbnail:x.snippet?.thumbnails?.high?.url||x.snippet?.thumbnails?.medium?.url||`https://i.ytimg.com/vi/${x.id}/hqdefault.jpg`}));
}
async function autoSync(category){
  let catalog=readCatalog(), current=catalog.filter(s=>s.enabled!==false&&s.category===category&&(s.youtubeId||s.audioUrl));
  if(current.length>=8)return{items:current,added:0,api:false};
  const p=readSchedule().find(x=>x.name===category),q=p?.query||category;
  if(API_KEY){try{const results=await youtubeSearch(q);const ids=new Set(catalog.map(s=>s.youtubeId).filter(Boolean));const selected=results.filter(x=>!ids.has(x.id)).filter(x=>/zubeen|জুবিন/i.test(`${x.title} ${x.artist}`)).slice(0,12);for(const x of selected){catalog.push({id:crypto.randomUUID(),title:x.title,artist:x.artist,year:x.year,category,youtubeId:x.id,duration:x.duration||0,thumbnail:x.thumbnail,enabled:true,source:'youtube-api'});ids.add(x.id)}if(selected.length)writeCatalog(catalog);current=catalog.filter(s=>s.enabled!==false&&s.category===category&&(s.youtubeId||s.audioUrl));if(current.length)return{items:current,added:selected.length,api:true}}catch(e){console.error('YouTube sync:',e.message)}}
  const existingIds=new Set(catalog.filter(s=>s.category===category).map(s=>s.youtubeId).filter(Boolean));
  for(const f of FALLBACKS){if(!existingIds.has(f.youtubeId)){catalog.push({...f,id:crypto.randomUUID(),category,source:'fallback'});existingIds.add(f.youtubeId)}}
  writeCatalog(catalog);return{items:catalog.filter(s=>s.enabled!==false&&s.category===category&&(s.youtubeId||s.audioUrl)),added:0,api:false};
}

const listeners=new Map(),station=new Map(),history=new Map();
function pushHistory(category,song,duration){if(!song)return;const k=stationKey(category),list=history.get(k)||[];list.unshift({...song,duration:Number(duration||song.duration||0),playedAt:Date.now()});history.set(k,list.slice(0,50))}
function pickNextSong(category,items,currentId){const recent=(history.get(stationKey(category))||[]).slice(0,Math.min(20,Math.max(0,items.length-1)));const recentIds=new Set(recent.map(x=>x.id));let candidates=items.filter(x=>x.id!==currentId&&!recentIds.has(x.id));if(!candidates.length)candidates=items.filter(x=>x.id!==currentId);if(!candidates.length)candidates=items;return candidates[Math.floor(Math.random()*candidates.length)]}
function stationItems(category){return readCatalog().filter(s=>s.enabled!==false&&s.category===stationKey(category)&&(s.youtubeId||s.audioUrl))}
function getStation(category,items){const key=stationKey(category);items=items||stationItems(key);let st=station.get(key);if(!st||!items.some(x=>x.id===st.songId)){const first=items[0];st={songId:first?.id||null,startedAt:Date.now(),revision:1,duration:Number(first?.duration||0)};station.set(key,st);if(first)pushHistory(key,first,st.duration)}let song=items.find(x=>x.id===st.songId)||items[0];if(song&&song.id!==st.songId){st.songId=song.id;st.startedAt=Date.now();st.revision++;st.duration=Number(song.duration||0)}if(song&&!st.duration&&song.duration)st.duration=Number(song.duration);let elapsed=Math.max(0,(Date.now()-st.startedAt)/1000);if(song&&st.duration>0&&elapsed>=st.duration+0.25&&items.length>1){const next=pickNextSong(key,items,song.id);st={songId:next.id,startedAt:Date.now(),revision:(st.revision||0)+1,duration:Number(next.duration||0)};station.set(key,st);pushHistory(key,next,st.duration);song=next;elapsed=0}return{category:key,song,startedAt:st.startedAt,serverNow:Date.now(),position:elapsed,duration:Number(st.duration||song?.duration||0),revision:st.revision}}
function setStationDuration(category,songId,duration){const key=stationKey(category),st=station.get(key),sec=Math.floor(Number(duration)||0);if(!st||st.songId!==songId||sec<1)return null;st.duration=sec;station.set(key,st);return getStation(key,stationItems(key))}
function advanceStation(category){const key=stationKey(category),items=stationItems(key);if(!items.length)return null;const current=getStation(key,items),next=pickNextSong(key,items,current.song.id);const st={songId:next.id,startedAt:Date.now(),revision:(current.revision||0)+1,duration:Number(next.duration||0)};station.set(key,st);pushHistory(key,next,st.duration);return getStation(key,items)}
function adminOK(req){if(!ADMIN_KEY)return true;const got=String(req.headers['x-admin-key']||'');const expected=String(ADMIN_KEY);const a=Buffer.from(got),b=Buffer.from(expected);return a.length===b.length&&crypto.timingSafeEqual(a,b)}
setInterval(()=>{const now=Date.now();for(const[id,t]of listeners)if(now-t>45000)listeners.delete(id)},15000).unref();
function safeFile(p){const decoded=decodeURIComponent(p.split('?')[0]);const normalized=path.normalize(decoded).replace(/^([.][.][/\\])+/, '');return path.join(ROOT,normalized==='/'?'index.html':normalized.replace(/^[/\\]+/,''))}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.mp3':'audio/mpeg','.m4a':'audio/mp4','.aac':'audio/aac','.ogg':'audio/ogg','.wav':'audio/wav'};

const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);
 if(req.method==='GET'&&u.pathname==='/api/health')return json(res,200,{ok:true,youtubeConfigured:Boolean(API_KEY),adminProtected:Boolean(ADMIN_KEY),listeners:listeners.size,catalogCount:readCatalog().length,programCount:readSchedule().length});
 if(req.method==='GET'&&u.pathname==='/api/listeners')return json(res,200,{listeners:listeners.size});
 if(req.method==='POST'&&u.pathname==='/api/listeners/heartbeat'){const b=await body(req),sid=clean(b.sessionId,120)||crypto.randomUUID();listeners.set(sid,Date.now());return json(res,200,{sessionId:sid,listeners:listeners.size})}
 if(req.method==='GET'&&u.pathname==='/api/songs'){const cat=clean(u.searchParams.get('category'),100),all=readCatalog().filter(s=>s.enabled!==false&&(s.youtubeId||s.audioUrl));return json(res,200,{items:cat?all.filter(s=>s.category===cat):all})}
 if(req.method==='POST'&&u.pathname==='/api/radio/bootstrap'){const b=await body(req),category=clean(b.category,100)||rotationForNow();return json(res,200,await autoSync(category))}
 if(req.method==='GET'&&u.pathname==='/api/youtube/search'){const q=clean(u.searchParams.get('q'),180);if(!q)return json(res,200,{items:[]});if(!API_KEY)return json(res,503,{error:'YOUTUBE_API_KEY is not configured on Render.'});return json(res,200,{items:await youtubeSearch(q)})}
 if(req.method==='GET'&&u.pathname==='/api/radio/history'){const cat=clean(u.searchParams.get('category'),100)||rotationForNow();return json(res,200,{items:(history.get(cat)||[]).slice(0,50)})}
 if(req.method==='GET'&&u.pathname==='/api/radio/state'){const cat=clean(u.searchParams.get('category'),100)||rotationForNow(),items=stationItems(cat);if(!items.length)return json(res,404,{error:'No playable songs in this rotation'});return json(res,200,getStation(cat,items))}
 if(req.method==='POST'&&u.pathname==='/api/radio/report-duration'){const b=await body(req),state=setStationDuration(clean(b.category,100)||rotationForNow(),clean(b.songId,200),b.duration);return state?json(res,200,state):json(res,409,{error:'Station state changed; duration ignored'})}
 if(req.method==='GET'&&u.pathname==='/api/radio/health'){const cat=clean(u.searchParams.get('category'),100)||rotationForNow(),items=stationItems(cat);return json(res,200,{ok:true,category:cat,playableSongs:items.length,online:true})}
 if(req.method==='GET'&&u.pathname==='/api/admin/songs')return json(res,200,{items:readCatalog()});
 if(req.method==='POST'&&u.pathname==='/api/admin/songs'){if(!adminOK(req))return json(res,401,{error:'Admin key required'});const b=await body(req),title=clean(b.title,180),youtubeId=clean(b.youtubeId,40),audioUrl=clean(b.audioUrl,1000);if(!title||(!youtubeId&&!audioUrl))return json(res,400,{error:'title and youtubeId/audioUrl required'});const catalog=readCatalog();if(youtubeId&&catalog.some(s=>s.youtubeId===youtubeId))return json(res,409,{error:'Already in catalog'});const song={id:crypto.randomUUID(),title,artist:clean(b.artist,120)||'Zubeen Garg',year:clean(b.year,20)||'—',category:clean(b.category,100)||'Zubeen Classics',youtubeId,audioUrl,thumbnail:clean(b.thumbnail,500),duration:Number(b.duration)||0,enabled:b.enabled!==false,source:'admin'};catalog.push(song);writeCatalog(catalog);return json(res,200,{song})}
 if(req.method==='PUT'&&u.pathname.startsWith('/api/admin/songs/')){if(!adminOK(req))return json(res,401,{error:'Admin key required'});const id=clean(u.pathname.split('/').pop(),200),b=await body(req),catalog=readCatalog(),i=catalog.findIndex(s=>s.id===id);if(i<0)return json(res,404,{error:'Song not found'});catalog[i]={...catalog[i],title:clean(b.title,180)||catalog[i].title,artist:clean(b.artist,120)||catalog[i].artist,year:clean(b.year,20)||catalog[i].year,category:clean(b.category,100)||catalog[i].category,youtubeId:clean(b.youtubeId,40),audioUrl:clean(b.audioUrl,1000),thumbnail:clean(b.thumbnail,500),duration:Number(b.duration)||catalog[i].duration||0,enabled:b.enabled!==false};writeCatalog(catalog);return json(res,200,{song:catalog[i]})}
 if(req.method==='DELETE'&&u.pathname.startsWith('/api/admin/songs/')){if(!adminOK(req))return json(res,401,{error:'Admin key required'});const id=clean(u.pathname.split('/').pop(),200),catalog=readCatalog(),next=catalog.filter(s=>s.id!==id);if(next.length===catalog.length)return json(res,404,{error:'Song not found'});writeCatalog(next);return json(res,200,{ok:true})}
 if(req.method==='POST'&&u.pathname==='/api/admin/sync'){if(!adminOK(req))return json(res,401,{error:'Admin key required'});const results=[];for(const p of readSchedule().filter(x=>x.enabled!==false)){results.push({program:p.name,...await autoSync(p.name)})}return json(res,200,{results})}
 if(req.method==='GET'&&u.pathname==='/api/schedule')return json(res,200,{items:readSchedule()});
 if(req.method==='PUT'&&u.pathname==='/api/admin/schedule'){if(!adminOK(req))return json(res,401,{error:'Admin key required'});const b=await body(req),items=Array.isArray(b.items)?b.items.map((x,i)=>({id:clean(x.id,80)||`program-${i+1}`,name:clean(x.name,100),query:clean(x.query,200),start:clean(x.start,5),end:clean(x.end,5),enabled:x.enabled!==false})).filter(x=>x.name):null;if(!items?.length)return json(res,400,{error:'At least one program is required'});writeSchedule(items);return json(res,200,{items})}
 if(req.method==='POST'&&u.pathname==='/api/admin/rotate'){if(!adminOK(req))return json(res,401,{error:'Admin key required'});const b=await body(req),state=advanceStation(clean(b.category,100)||rotationForNow());return state?json(res,200,state):json(res,404,{error:'No songs'})}
 let file=safeFile(u.pathname);if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(ROOT,'index.html');const ext=path.extname(file).toLowerCase();res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
 }catch(e){console.error(e);json(res,500,{error:e.message||'Server error'})}});
ensureData();server.listen(PORT,()=>console.log(`Zubeen Radio listening on ${PORT} | YouTube API: ${API_KEY?'ON':'OFF'} | Admin key: ${ADMIN_KEY?'ON':'OFF'}`));
