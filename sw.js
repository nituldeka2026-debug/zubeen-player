const CACHE_V9='zubeen-radio-v10-photo';
const APP=['/','/index.html','/style.css','/app.js','/schedule.html','/manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_V9).then(c=>c.addAll(APP)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_V9).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{if(r.ok&&new URL(e.request.url).origin===location.origin){const copy=r.clone();caches.open(CACHE_V9).then(c=>c.put(e.request,copy)).catch(()=>{})}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/'))))});
