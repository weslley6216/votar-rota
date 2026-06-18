// Service worker do Votar Rota.
// Estratégia: stale-while-revalidate só para o shell (mesma origem).
// Requisições ao Google Forms passam direto pela rede, sem cache.

const VERSAO = "votar-rota-v3";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(VERSAO)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(
        chaves.filter((chave) => chave !== VERSAO).map((chave) => caches.delete(chave))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const req = evento.request;

  // Só cuidamos de navegação/assets próprios em GET.
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  evento.respondWith(
    caches.open(VERSAO).then(async (cache) => {
      const cacheado = await cache.match(req, { ignoreSearch: true });

      const rede = fetch(req)
        .then((resposta) => {
          if (resposta && resposta.ok) cache.put(req, resposta.clone());
          return resposta;
        })
        .catch(() => cacheado);

      // A página em si vai na rede primeiro: uma alteração aparece já na
      // abertura seguinte, e o cache só entra se estiver sem sinal.
      if (req.mode === "navigate") return (await rede) || cacheado;

      // Ícones e manifesto podem servir do cache e atualizar em segundo plano.
      return cacheado || rede;
    })
  );
});
