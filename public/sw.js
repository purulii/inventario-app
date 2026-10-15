self.addEventListener('install',e=>e.waitUntil(caches.open('inv1').then(c=>c.addAll(['/','/app.js','/manifest.json']))));
self.addEventListener('fetch',e=>{if(e.request.url.includes('/api/'))return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});
