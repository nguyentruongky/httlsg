import app from './app';

const port = Number(process.env.API_PORT || 3001);

Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`HTKV TP.HCM Hono API server listening on http://localhost:${port}`);
