// service-worker.js - VERSÃO CORRIGIDA

const CACHE_NAME = 'finance-control-pro-v1';
// Lista de arquivos a serem cacheados.
// CORREÇÃO: Caminhos ajustados para serem relativos à raiz do projeto.
const urlsToCache = [
  '/',
  'index.html',
  'reports.html',
  'main.js',
  'reports.js',
  'firebase-config.js',
  'manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Evento de Instalação: abre o cache e adiciona os arquivos principais.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache).catch(error => {
            console.error('Falha ao adicionar arquivos ao cache:', error);
            // Isso ajuda a identificar qual URL específica pode estar falhando.
            urlsToCache.forEach(url => {
                fetch(url).catch(err => console.error(`Falha ao buscar: ${url}`, err));
            });
        });
      })
  );
});

// Evento de Ativação: limpa caches antigos.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Evento de Fetch: serve arquivos do cache ou da rede.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se o arquivo for encontrado no cache, retorna ele.
        if (response) {
          return response;
        }
        // Caso contrário, busca na rede.
        return fetch(event.request);
      }
    )
  );
});