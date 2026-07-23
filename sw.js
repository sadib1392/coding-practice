/* Practice Log service worker */
const SHELL = "shell-v7";
const RUNTIME = "pyodide-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./book/ch01.js",
  "./book/ch02.js",
  "./book/ch03.js",
  "./book/ch04.js",
  "./book/ch05.js",
  "./book/ch06.js",
  "./book/ch07.js",
  "./book/ch08.js",
  "./book/ch09.js",
  "./book/ch10.js",
  "./book/ch11.js",
  "./book/ch12.js",
  "./book/ch13.js",
  "./book/ch14.js",
  "./book/ch15.js",
  "./book/ch16.js",
  "./book/ch17.js",
  "./book/ch18.js",
  "./book/ch19.js",
  "./book/ch20.js",
  "./book/ch21.js",
  "./book/ch22.js",
  "./book/ch23.js",
  "./book/ch24.js",
  "./book/r01.js",
  "./book/r02.js",
  "./book/r03.js",
  "./book/r04.js",
  "./book/r05.js",
  "./book/r06.js",
  "./book/r07.js",
  "./book/r08.js",
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

// Language runtimes: Pyodide (Python) and WebR (R). Both are large, immutable
// downloads, so they live in their own cache and are kept forever.
const isRuntime = (url) =>
  url.includes("pyodide") || url.includes("webr.r-wasm.org") ||
  url.endsWith(".wasm") || url.endsWith(".zip") || url.endsWith(".data");

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = req.url;

  // Runtimes: cache-first and keep forever. This is what makes Python and R work underground.
  if (isRuntime(url)) {
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
