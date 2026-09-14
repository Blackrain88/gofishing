/* 바다가자 서비스워커 — 앱 셸 오프라인 캐시
   앱을 수정한 뒤에는 VERSION 숫자를 올려야 기기에 새 버전이 반영됩니다. */
const VERSION = 'badagaja-v14';
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

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  /* 앱 자체(문서)는 네트워크 우선.
     캐시 우선으로 두면 파일을 새로 올려도 "다음 실행"에야 반영돼서
     방금 고친 게 안 고쳐진 것처럼 보인다. 오프라인이면 캐시로 넘어간다. */
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  /* 나머지는 stale-while-revalidate: 캐시를 즉시 내주고 뒤에서 갱신 */
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
