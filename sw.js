// O jogo mudou para https://granulando.netlify.app/. Este service worker so desfaz o antigo: apaga o jogo guardado
// para abrir sem internet, sai de cena e recarrega as abas, que entao abrem a pagina de mudanca de endereco.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evento) => evento.waitUntil((async () => {
    for (const nome of await caches.keys()) await caches.delete(nome);
    await self.registration.unregister();
    for (const cliente of await self.clients.matchAll({ type: 'window' })) cliente.navigate(cliente.url);
})()));
