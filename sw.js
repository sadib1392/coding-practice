/* Practice Log service worker */
const SHELL = "shell-v3";
const RUNTIME = "pyodide-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL)
      .then((c) => c.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

const isPyodide = (url) =>
  url.includes("pyodide") || url.endsWith(".wasm") || url.endsWith(".zip") || url.endsWith(".data");

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = req.url;

  // Python runtime: cache-first and keep forever. This is what makes Python work underground.
  if (isPyodide(url)) {
    e.respondWith(
      caches.open(RUNTIME).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
          return res;
        } catch (err) {
          return new Response("", { status: 504, statusText: "offline, runtime not cached" });
        }
      })
    );
    return;
  }

  // App shell: network-first so edits show up, cache as the offline fallback.
  if (url.startsWith(self.location.origin)) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
    );
  }
});

// Lets the page ask how much of the runtime is cached.
self.addEventListener("message", async (e) => {
  if (e.data === "runtime-status") {
    const cache = await caches.open(RUNTIME);
    const keys = await cache.keys();
    e.source.postMessage({ type: "runtime-status", files: keys.length });
  }
});
