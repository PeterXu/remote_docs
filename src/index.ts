// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { authMiddleware } from './middleware/auth';
import { pdfRouter } from './routes/pdf';
import { healthRouter } from './routes/health';

const app = new Hono();

// 全局中间件
app.use('*', logger());
app.use('*', cors());

// 健康检查（无需认证）
app.route('/api/v1/health', healthRouter);

// PDF导出（需要认证）
const protectedApi = new Hono();
protectedApi.use('*', authMiddleware);
protectedApi.route('/pdf', pdfRouter);
app.route('/api/v1', protectedApi);

// 404处理
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
    },
    404
  );
});

// 全局错误处理
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json(
    {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message },
    },
    500
  );
});

// 启动服务器
const port = parseInt(process.env.PORT || '3000');

serve({
  fetch: app.fetch,
  port,
});

console.log(`🚀 docsvr running on port ${port}`);
