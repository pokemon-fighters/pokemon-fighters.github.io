/*
============================================================
 POKÉMON FIGHTER — SERVICE WORKER

 Two responsibilities:
 1. Offline/installable support — precache the app shell so the
    installed PWA still opens without a network connection.
 2. Self-updating — bump CACHE_VERSION on every real deploy. A new
    version installs in the background, calls skipWaiting() so it
    takes over immediately, and clients.claim() so it controls
    already-open tabs right away. app.js listens for the resulting
    "controllerchange" event and reloads the page once.
============================================================
*/

const CACHE_VERSION = "v43";
const SHELL_CACHE = `fighter-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `fighter-runtime-${CACHE_VERSION}`;

const SHELL_FILES = [
  "./",
  "./index.html",
  "./app.js",
  "./friends.js",
  "./game.js",
  "./adventure.js",
  "./style.css",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png",
  "./pokeball.png",
];

const FIREBASE_SCRIPTS = [
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .catch(() => {}),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") {
    return;
  }

  const url = new URL(req.url);

  if (url.origin !== self.location.origin) {
    if (FIREBASE_SCRIPTS.includes(req.url)) {
      event.respondWith(
        caches.match(req).then(
          (cached) =>
            cached ||
            fetch(req).then((res) => {
              if (res && (res.ok || res.type === "opaque")) {
                const copy = res.clone();

                caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
              }

              return res;
            }),
        ),
      );
    }

    return;
  }

  const isShellFile =
    req.mode === "navigate" ||
    SHELL_FILES.some((file) => url.pathname.endsWith(file.replace("./", "/")));

  if (isShellFile) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();

            caches.open(SHELL_CACHE).then((cache) => cache.put(req, copy));
          }

          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match("./index.html")),
        ),
    );

    return;
  }

  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();

            caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
          }

          return res;
        }),
    ),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
