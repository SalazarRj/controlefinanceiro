// Define o nome e a versão do cache. Mudar a versão aqui força a atualização de todos os ficheiros.
const CACHE_NAME = "financeiro-cache-v2";

// Lista de ficheiros essenciais para a aplicação funcionar offline.
// Use caminhos relativos para garantir que funciona em qualquer ambiente.
const urlsToCache = [
  './',
  './index.html',
  './projecao.html',
  './firebase-config.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Evento 'install': Guarda os ficheiros essenciais em cache.
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log("Service Worker: Cache aberto e a guardar ficheiros essenciais.");
        // O addAll faz o download e guarda todos os ficheiros da lista.
        // Se um deles falhar, a instalação inteira falha.
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
          console.error("Service Worker: Falha ao guardar ficheiros no cache durante a instalação.", error);
      })
  );
});

// Evento 'activate': Limpa os caches antigos.
// Isto é crucial para garantir que os utilizadores recebem as atualizações.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Se o nome do cache não for o atual, ele é apagado.
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: A limpar cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Evento 'fetch': Interceta os pedidos de rede e serve a partir do cache primeiro.
self.addEventListener("fetch", event => {
  event.respondWith(
    // Tenta encontrar o pedido no cache.
    caches.match(event.request).then(response => {
      // Se encontrar no cache (response !== null), retorna a versão guardada.
      // Se não, faz o pedido à rede.
      return response || fetch(event.request);
    })
  );
});
