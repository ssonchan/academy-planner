// 앱 화면을 저장해 두고, 인터넷이 될 때는 항상 최신 버전을 먼저 받아요.
const CACHE = "academy-planner-v2";
const SHELL = ["./", "./index.html", "./app.js", "./manifest.webmanifest", "./icon.svg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Supabase 라이브러리(고정 버전): 한 번 받으면 저장해서 오프라인에서도 앱이 열리게
  if (u.hostname === "cdn.jsdelivr.net" && /@supabase\/supabase-js@\d+\.\d+\.\d+\//.test(u.pathname)) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); }
      return res;
    })));
    return;
  }
  if (u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html"))));
});
