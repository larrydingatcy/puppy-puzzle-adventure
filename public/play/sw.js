const cacheName='future-shell-v2';
const shell=['./index.html','./style.css','./ui.mjs','./parent.mjs','./game.mjs','./missions.mjs','./forest.mjs','./demo.mjs','./mode.mjs','./manifest.webmanifest','./icon.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(cacheName).then(c=>c.addAll(shell))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('future-shell-')&&k!==cacheName).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||!event.request.url.startsWith(self.registration.scope)) return;
  event.respondWith(fetch(event.request).catch(async()=>await caches.match(event.request)||await caches.match('./index.html')));
});
