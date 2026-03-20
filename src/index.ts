// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { bodyLimit } from 'hono/body-limit';
import { serve } from '@hono/node-server';
import { authMiddleware } from './middleware/auth';
import { pdfRouter } from './routes/pdf';
import { healthRouter } from './routes/health';

// Validate required environment variables at startup
const requiredEnvVars = ['SUPABASE_JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Fatal: Required environment variable ${envVar} is not set`);
    process.exit(1);
  }
}

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors());

// Body size limit (15MB - slightly above 10MB markdown + JSON overhead)
app.use(
  '/api/v1/pdf/*',
  bodyLimit({
    maxSize: 15 * 1024 * 1024,
    onError: (c) =>
      c.json(
        {
          success: false,
          error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds 15MB limit' },
        },
        413
      ),
  })
);

// Health check (no auth required)
app.route('/api/v1/health', healthRouter);

// PDF export (auth required)
const protectedApi = new Hono();
protectedApi.use('*', authMiddleware);
protectedApi.route('/pdf', pdfRouter);
app.route('/api/v1', protectedApi);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
    },
    404
  );
});

// Global error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json(
    {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    },
    500
  );
});

// Start server
const port = parseInt(process.env.PORT || '3000');

serve({
  fetch: app.fetch,
  port,
});

console.log(`🚀 remote_docs running on port ${port}`);
