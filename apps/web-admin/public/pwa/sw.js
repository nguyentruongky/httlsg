/* Cache public assets and the built Vite shell only. Never cache API/auth responses or Next HTML/RSC. */
const VERSION = "6dfedaab6d51d42b";
const ENTRY = "/client";
// Filled with the public build outputs by Vite; empty for the Next.js worker.
const SHELL_ASSETS = [];
const CACHE = "church-public-pwa-" + VERSION;
const ASSETS = ["/pwa/offline.html", "/pwa/icon-192.png", "/pwa/icon-512.png", "/pwa/apple-touch-icon.png", "/pwa/maskable-512.png"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...ASSETS, ...SHELL_ASSETS]))));
self.addEventListener("activate", event => event.waitUntil(Promise.all([
 caches.keys().then(names => Promise.all(names.filter(name => name.startsWith("church-public-pwa-") && name !== CACHE).map(name => caches.delete(name)))),
 self.clients.claim()
])));
self.addEventListener("message", event => {
 if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
 if (event.data?.type === "CLEAR_NOTIFICATIONS") event.waitUntil(self.registration.getNotifications().then(items => items.forEach(item => item.close())));
});
self.addEventListener("fetch", event => {
 const url = new URL(event.request.url);
 if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
 if (ASSETS.includes(url.pathname) || (SHELL_ASSETS.includes(url.pathname) && url.pathname !== "/index.html")) {
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request)) || fetch(event.request)));
  return;
 }
 const memberPage = url.pathname === ENTRY || url.pathname === "/client" || url.pathname.startsWith("/client/") ||
  (SHELL_ASSETS.length > 0 && !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/_next/"));
 if (event.request.mode === "navigate" && memberPage) {
  event.respondWith((async () => {
   const controller = new AbortController();
   const timer = setTimeout(() => controller.abort(), 8000);
   try {
    const response = await fetch(event.request, {cache:"no-store", signal:controller.signal});
    if (response.status >= 500) throw new Error("Unavailable");
    return response;
   } catch {
    const cache = await caches.open(CACHE);
    return (SHELL_ASSETS.length > 0 && await cache.match("/index.html")) || await cache.match("/pwa/offline.html") ||
     new Response("Hội Thánh · Bạn đang ngoại tuyến. Kết nối Internet rồi tải lại.", {headers:{"Content-Type":"text/plain; charset=utf-8"}});
   } finally { clearTimeout(timer); }
  })());
 }
});
function destination(value) {
 if (typeof value === "string") value = value.replace(/^\/#\//, "/client/");
 if (typeof value !== "string" || !/^\/client#?\/(profile|assignments|events\/[0-9a-f-]{36})$/i.test(value)) return "/client/profile";
 return value.replace("/client#/", "/client/");
}
self.addEventListener("push", event => {
 let value = {};
 try { value = event.data?.json() || {}; } catch {}
 // Even malformed payloads produce a visible generic notification (Safari requirement).
 const title = typeof value.title === "string" ? value.title.slice(0,100) : "Thông báo mới từ Hội Thánh";
 const body = typeof value.body === "string" ? value.body.slice(0,240) : "Mở ứng dụng để xem thông báo.";
 event.waitUntil(self.registration.showNotification(title, {body,icon:"/pwa/icon-192.png",badge:"/pwa/icon-192.png",tag:typeof value.tag === "string" ? value.tag.slice(0,100) : "church-notification",data:{url:destination(value.url)}}));
});
self.addEventListener("notificationclick", event => {
 event.notification.close();
 const raw=event.notification.data?.url;
 const url=new URL(destination(raw),self.location.origin).href;
 event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async windows => {
  const existing=windows.find(client=>{const path=new URL(client.url);return path.origin===self.location.origin&&(path.pathname===ENTRY||path.pathname==="/client"||path.pathname.startsWith("/client/"));});
  if(existing){try {const navigated=await existing.navigate(url);return (navigated || existing).focus();}catch {return self.clients.openWindow(url);}}
  return self.clients.openWindow(url);
 }));
});
self.addEventListener("notificationclose", () => { /* No private payload or click tracking. */ });
