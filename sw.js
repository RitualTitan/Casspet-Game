// Guarda os arquivos do jogo para ele abrir sem internet depois da primeira visita.
// Sempre tenta a rede primeiro, para as atualizacoes chegarem na hora; o que ficou
// guardado so e usado quando a rede falha.
const CACHE = 'granulando-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (evento) => {
    const pedido = evento.request;
    if (pedido.method !== 'GET') return;
    const url = new URL(pedido.url);
    // Arquivos do proprio jogo e o Phaser; o resto passa direto.
    if (url.origin !== self.location.origin && url.hostname !== 'cdn.jsdelivr.net') return;
    evento.respondWith(fetch(pedido).then((resposta) => {
        if (resposta.ok) {
            const copia = resposta.clone();
            caches.open(CACHE).then((cache) => cache.put(pedido, copia));
        }
        return resposta;
    }).catch(() => caches.match(pedido)
        .then((guardado) => guardado || caches.match(pedido, { ignoreSearch: true }))
        .then((guardado) => guardado || Response.error())));
});
