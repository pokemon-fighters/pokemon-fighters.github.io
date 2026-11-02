/*
============================================================
 POKÉMON FIGHTER — SERVICE WORKER

 Two responsibilities:
 1. Offline/installable support — precache the app shell so the
    installed PWA still opens without a network connection.
 2. Self-updating — bump CACHE_VERSION on every real deploy. A new
    version installs in the background, calls skipWaiting() so it
    takes over immediately instead of waiting for every tab to
    close, and clients.claim() so it controls already-open tabs
    right away. app.js listens for the resulting "controllerchange"
    event and reloads the page once, so anyone with the app open
    converges to the new build within a couple of seconds — no
    manual cache-clearing needed.
============================================================
*/

const CACHE_VERSION = "v38";
const SHELL_CACHE = `fighter-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `fighter-runtime-${CACHE_VERSION}`;

const SHELL_FILES = [
  "./",
  "./index.html",
  "./app.js",
  "./friends.js",
  "./game.js",
  "./style.css",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png",
  "./pokeball.png",
];

/* Third-party scripts the app needs to boot (Firebase). Cached
   cache-first so a previously signed-in trainer can still open the
   installed app offline. */
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
      .catch(() => {
        /* A single missing/blocked file shouldn't fail the whole
           install — the shell still works without a perfect
           precache, it'll just fall through to a network fetch for
           whatever wasn't cached ahead of time. */
      }),
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

  /* Only handle same-origin requests ourselves — PokéAPI, sprite
     artwork, Firebase, the match server, etc. all go straight to
     the network untouched. */
  if (url.origin !== self.location.origin) {
    if (FIREBASE_SCRIPTS.includes(req.url)) {
      event.respondWith(
        caches.match(req).then(
          (cached) =>
            cached ||
            fetch(req).then((res) => {
              /* Opaque (no-cors) responses have status 0 — still fine
                 to cache for <script> use. */
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
    /* Network-first for the app shell itself: always try to fetch
       the latest index.html/app.js/game.js/style.css first (so a
       fresh deploy is picked up as soon as possible), falling back
       to whatever's cached only when actually offline. This is what
       makes the self-update flow above meaningful — a stale cached
       shell would otherwise keep serving old code indefinitely. */
    event.respondWith(
      fetch(req)
        .then((res) => {
          /* Never cache error pages (404/500) over a good copy. */
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

  /* Everything else same-origin (icons, the Poké Ball artwork,
     etc.) — cache-first, since these don't change between deploys
     the way the shell files do. */
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
