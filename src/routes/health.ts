// src/routes/health.ts
import { Hono } from 'hono';
import { checkGotenbergHealth } from '../services/gotenberg';
import { checkSupabaseHealth } from '../services/supabase';
import type { HealthResponse } from '../types';

export const healthRouter = new Hono();

// GET /api/v1/health
healthRouter.get('/', async (c) => {
  const [gotenbergOk, supabaseOk] = await Promise.all([
    checkGotenbergHealth(),
    checkSupabaseHealth(),
  ]);

  const allHealthy = gotenbergOk && supabaseOk;

  const response: HealthResponse = {
    status: allHealthy ? 'healthy' : 'unhealthy',
    services: {
    gotenberg: gotenbergOk ? 'ok' : 'error',
    supabase: supabaseOk ? 'ok' : 'error',
  },
  };

  return c.json(response, allHealthy ? 200 : 503);
});
