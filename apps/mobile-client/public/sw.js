/* Public-only offline cache. Never cache app HTML, Next RSC, auth or API data. */
const VERSION = "53f026cc6d4e247b";
const ENTRY = "/";
const CACHE = "church-public-pwa-" + VERSION;
const ASSETS = ["/pwa/offline.html", "/pwa/icon-192.png", "/pwa/icon-512.png", "/pwa/apple-touch-icon.png", "/pwa/maskable-512.png"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
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
 if (ASSETS.includes(url.pathname)) {
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request)) || fetch(event.request)));
  return;
 }
 const memberPage = ENTRY === "/" ? url.pathname === "/" : (url.pathname === ENTRY || url.pathname.startsWith(ENTRY + "/"));
 if (event.request.mode === "navigate" && memberPage) {
  event.respondWith(fetch(event.request, {cache:"no-store"}).catch(async () => (await (await caches.open(CACHE)).match("/pwa/offline.html")) || new Response("Hội Thánh · Bạn đang ngoại tuyến. Kết nối Internet rồi tải lại.", {headers:{"Content-Type":"text/plain; charset=utf-8"}})));
 }
});
function destination(value) {
 if (typeof value !== "string" || !/^\/client#\/(profile|assignments|events\/[0-9a-f-]{36})$/i.test(value)) return ENTRY + "#/profile";
 return ENTRY + value.slice("/client".length);
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
 const canonical=typeof raw === "string" && raw.startsWith(ENTRY + "#/") ? "/client" + raw.slice(ENTRY.length) : "/client#/profile";
 const url=new URL(destination(canonical),self.location.origin).href;
 event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async windows => {
  const existing=windows.find(client=>{const path=new URL(client.url);return path.origin===self.location.origin&&(ENTRY==="/"?path.pathname==="/":path.pathname===ENTRY||path.pathname.startsWith(ENTRY+"/"));});
  if(existing){try {const navigated=await existing.navigate(url);return (navigated || existing).focus();}catch {return self.clients.openWindow(url);}}
  return self.clients.openWindow(url);
 }));
});
self.addEventListener("notificationclose", () => { /* No private payload or click tracking. */ });
