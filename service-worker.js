self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open("runtrack-cache").then(cache=>{
      return cache.addAll([
        "/",
        "/index.html",
        "/style.css",
        "/app.js",
        "/manifest.json"
      ]);
    })
  );
});
