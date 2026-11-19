import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { hasDatabase } from '../db';
import { dashboardRoute } from './routes/dashboard';
import { churchesRoute } from './routes/churches';
import { departmentsRoute } from './routes/departments';
import { clergyRoute } from './routes/clergy';

const app = new Hono();

app.use('*', logger());

app.onError((err, c) => {
  console.error('[API Error]', err);
  return c.json({ error: err.message || 'Internal Server Error' }, 500);
});

const routes = app
  .basePath('/api')
  .get('/health', (c) => {
    return c.json({
      ok: true,
      service: 'HTKV TP.HCM Church Management API',
      runtime: typeof Bun !== 'undefined' ? `bun-${Bun.version}` : 'node',
      database: hasDatabase ? 'postgres-live' : 'memory-172-seeded',
      timestamp: new Date().toISOString(),
    });
  })
  .route('/dashboard', dashboardRoute)
  .route('/churches', churchesRoute)
  .route('/departments', departmentsRoute)
  .route('/clergy', clergyRoute);

export type AppType = typeof routes;
export default app;
