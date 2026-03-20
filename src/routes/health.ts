// src/routes/health.ts
import { Hono } from 'hono';
import { checkGotenbergHealth } from '../services/gotenberg';

export const healthRouter = new Hono();

// GET /api/v1/health
healthRouter.get('/', async (c) => {
  const gotenbergOk = await checkGotenbergHealth();

  const allHealthy = gotenbergOk;

  return c.json(
    {
      status: allHealthy ? 'healthy' : 'unhealthy',
      services: {
        gotenberg: gotenbergOk ? 'ok' : 'error',
      },
    },
    allHealthy ? 200 : 503
  );
});
