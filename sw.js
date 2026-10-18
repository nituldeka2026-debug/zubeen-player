const CACHE_V10='zubeen-radio-v13-security-ist-playback-fix';
const APP=['/','/index.html','/style.css','/app.js','/schedule.html','/manifest.webmanifest','/icon.svg','/icon-192.png','/icon-512.png','/assets/zubeen-bg.jpg','/assets/zubeen-bg-wide.jpg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_V10).then(c=>c.addAll(APP)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_V10).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/api/')){e.respondWith(fetch(e.request,{cache:'no-store'}));return;}
  if(!APP.includes(url.pathname))return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE_V10).then(c=>c.put(e.request,copy)).catch(()=>{});}return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html'))));
});
