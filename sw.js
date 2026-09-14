/* 바다가자 서비스워커 — 앱 셸 오프라인 캐시
   앱을 수정한 뒤에는 VERSION 숫자를 올려야 기기에 새 버전이 반영됩니다. */
const VERSION = 'badagaja-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* stale-while-revalidate: 캐시를 즉시 내주고 뒤에서 갱신.
   전파가 없는 곳에서도 앱이 바로 뜨고, 온라인이면 다음 실행에 최신이 반영됩니다. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  e.respondWith(
    caches.match(req).then(cached => {
      const fresh = fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached || caches.match('./index.html'));
      return cached || fresh;
    })
  );
});
