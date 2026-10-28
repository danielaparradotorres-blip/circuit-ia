// Circuit IA — Service Worker
// Sube el número de versión cada vez que publiques cambios en index.html
const CACHE = 'circuitia-v7';

const PRECACHE = [
    './',
    './index.html',
    './manifest.json',
    './icons/favicon-32.png',
    './icons/favicon-16.png',
    './icons/apple-touch-icon.png',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/arduino.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE)
            // Cada recurso se guarda por separado: si uno falla, los demás igual quedan en caché
            .then(cache => Promise.allSettled(PRECACHE.map(url => cache.add(url))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const req = event.request;
    // Las consultas a la IA (POST) nunca se guardan en caché
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.hostname.endsWith('workers.dev')) return;

    // Páginas: primero la red (para recibir actualizaciones), si no hay internet, la caché
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then(res => { const copia = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copia)); return res; })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    // Recursos estáticos, librerías y fuentes: caché primero y actualización en segundo plano
    event.respondWith(
        caches.match(req).then(enCache => {
            const red = fetch(req)
                .then(res => {
                    if (res && (res.ok || res.type === 'opaque')) {
                        const copia = res.clone();
                        caches.open(CACHE).then(c => c.put(req, copia));
                    }
                    return res;
                })
                .catch(() => enCache);
            return enCache || red;
        })
    );
});
