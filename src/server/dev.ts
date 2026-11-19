import app from './app';

const port = Number(process.env.API_PORT || 3001);

console.log(`HTKV TP.HCM Hono API server listening on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
