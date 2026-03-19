# docsvr - PDF导出服务设计文档

## 概述

docsvr是一个文档处理服务，首先实现PDF导出功能：将Markdown转换为PDF，上传至Supabase Storage，并通过Realtime通知用户。

## 技术选型

| 组件 | 技术 |
|------|------|
| 运行时 | Node.js 20 |
| Web框架 | Hono |
| PDF生成 | Puppeteer + Chromium |
| Markdown解析 | marked |
| 样式模板 | github-markdown-css |
| 数据库客户端 | @supabase/supabase-js |
| JWT验证 | hono/jwt |
| 部署 | Docker |

## 项目结构

```
docsvr/
├── src/
│   ├── index.ts              # 入口，Hono应用
│   ├── routes/
│   │   └── pdf.ts            # PDF相关API路由
│   ├── services/
│   │   ├── browser-pool.ts   # 浏览器实例池管理
│   │   ├── pdf-generator.ts  # PDF生成核心逻辑
│   │   ├── supabase.ts       # Supabase客户端(Storage/DB)
│   │   └── load-monitor.ts   # 负载监控服务
│   ├── templates/
│   │   ├── base.ts           # 基础样式
│   │   ├── github.ts         # GitHub风格样式
│   │   └── index.ts          # 模板注册表
│   ├── middleware/
│   │   └── auth.ts           # JWT验证中间件
│   └── utils/
│       └── markdown.ts       # Markdown解析
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

## API接口设计

### POST /api/v1/pdf/export

**请求**
```json
{
  "markdown": "# Hello World\n\nContent here...",
  "template": "github",
  "filename": "document.pdf",
  "export_id": "uuid",
  "options": {
    "format": "A4",
    "margin": {
      "top": "20mm",
      "bottom": "20mm",
      "left": "15mm",
      "right": "15mm"
    }
  }
}
```

**响应**
```json
{
  "success": true,
  "data": {
    "export_id": "uuid",
    "storage_path": "pdfs/2024/03/document.pdf",
    "status": "completed"
  }
}
```

**错误响应**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_MARKDOWN",
    "message": "Markdown content is required"
  }
}
```

### GET /api/v1/health

健康检查端点，返回服务状态和浏览器池状态。

```json
{
  "status": "healthy",
  "browser_pool": {
    "total": 5,
    "available": 3,
    "busy": 2
  },
  "load": {
    "cpu": 45,
    "memory": 62
  }
}
```

## 数据库设计

### pdf-export 表

```sql
CREATE TABLE pdf_export (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,

  -- 请求参数
  markdown TEXT NOT NULL,
  template VARCHAR(50) DEFAULT 'base',
  filename VARCHAR(255),
  options JSONB DEFAULT '{}',

  -- 状态与结果
  status VARCHAR(20) DEFAULT 'pending',
  storage_path TEXT,
  error_message TEXT,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_pdf_export_user ON pdf_export(user_id);
CREATE INDEX idx_pdf_export_status ON pdf_export(status);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pdf_export_updated_at
  BEFORE UPDATE ON pdf_export
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Realtime启用
ALTER PUBLICATION supabase_realtime ADD TABLE pdf_export;
```

### Storage Bucket

```
Bucket: pdf-exports
├── {user_id}/
│   ├── {year}/
│   │   ├── {month}/
│   │   │   └── {export_id}.pdf
```

## 浏览器池与负载控制

### 浏览器池设计

```typescript
class BrowserPool {
  private pool: BrowserInstance[] = [];
  private maxInstances: number = 5;
  private minInstances: number = 2;

  async initialize() {
    for (let i = 0; i < this.minInstances; i++) {
      await this.createInstance();
    }
  }

  async acquire(): Promise<BrowserInstance> {
    const instance = this.findAvailable();
    if (instance) return instance;

    if (this.canScaleUp()) {
      return this.createInstance();
    }

    return this.waitForAvailable();
  }

  release(instance: BrowserInstance) {
    instance.markAvailable();
  }
}
```

### 负载监控

```typescript
class LoadMonitor {
  getLoadScore(): number {
    const cpu = this.getCpuUsage();
    const memory = this.getMemoryUsage();
    const activeJobs = this.getActiveJobsCount();

    return cpu * 0.4 + memory * 0.3 + activeJobs * 30 / maxJobs;
  }

  canAcceptJob(): boolean {
    return this.getLoadScore() < 80;
  }

  suggestWaitTime(): number {
    const score = this.getLoadScore();
    if (score < 50) return 0;
    if (score < 70) return 500;
    return 2000;
  }
}
```

### 请求处理流程

```
请求到达 → 检查负载 → 负载过高 → 返回503 + 建议重试时间
    ↓
获取浏览器实例
    ↓
渲染Markdown为HTML → 应用模板样式
    ↓
生成PDF → 上传Storage → 更新数据库
    ↓
释放浏览器实例 → 返回成功响应
```

## Markdown解析与模板系统

### Markdown解析

使用 marked 库，配置 GFM 支持。

```typescript
import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: true,
});
```

### 模板系统

```typescript
interface PDFTemplate {
  name: string;
  description: string;
  css: string;
  header?: string;
  footer?: string;
}

const templates: Record<string, PDFTemplate> = {
  base: {
    name: '基础样式',
    description: '简洁的黑白样式',
    css: `body { font-family: system-ui; line-height: 1.6; }...`
  },
  github: {
    name: 'GitHub风格',
    description: '仿GitHub markdown渲染',
    css: `@import 'github-markdown-css';`
  }
};
```

### PDF生成配置

```typescript
const pdfOptions = {
  format: 'A4',
  margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
  printBackground: true,
  displayHeaderFooter: true,
  footerTemplate: `
    <div style="font-size: 10px; text-align: center; width: 100%;">
      <span class="pageNumber"></span> / <span class="totalPages"></span>
    </div>
  `
};
```

## JWT认证

### 中间件实现

```typescript
import { createMiddleware } from 'hono/factory';
import { verify } from 'hono/jwt';

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED' } }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verify(token, c.env.SUPABASE_JWT_SECRET);
    c.set('user', { id: payload.sub, email: payload.email });
    await next();
  } catch (err) {
    return c.json({ success: false, error: { code: 'INVALID_TOKEN' } }, 401);
  }
});
```

### 环境变量

```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3000
BROWSER_POOL_MIN=2
BROWSER_POOL_MAX=5
```

## Docker部署

### Dockerfile

```dockerfile
FROM node:20-slim

RUN apt-get update && apt-get install -y \
    chromium \
    fonts-wqy-zenhei \
    fonts-wqy-microhei \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

RUN groupadd -r pptruser && useradd -r -g pptruser pptruser
USER pptruser

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  docsvr:
    build: .
    ports:
      - "3000:3000"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - BROWSER_POOL_MIN=2
      - BROWSER_POOL_MAX=5
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 512M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
```

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase Platform                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Edge Function│  │   Storage    │  │      Database        │  │
│  │  (调用方)     │  │ (PDF存储)    │  │  ┌────────────────┐  │  │
│  └──────┬───────┘  └──────▲───────┘  │  │  pdf-export    │  │  │
│         │                 │          │  │     (表)       │  │  │
│         │                 │          │  └───────┬────────┘  │  │
│         │                 │          │          │           │  │
│         │                 │          │  ┌───────▼────────┐  │  │
│         │                 │          │  │   Realtime     │  │  │
│         │                 │          │  │   (推送通知)    │  │  │
└─────────┼─────────────────┼──────────┴──────────────────────┴──┘
          │                 │
          │ JWT Token       │ Upload PDF
          ▼                 │
┌─────────────────────────────────────────────────────────────────┐
│                      docsvr (Docker)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Hono API Server                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │ Auth(JWT)   │  │ Load Monitor│  │  Routes /pdf    │   │  │
│  │  └─────────────┘  └─────────────┘  └────────┬────────┘   │  │
│  └─────────────────────────────────────────────┼────────────┘  │
│                                                │               │
│  ┌─────────────────────────────────────────────▼────────────┐  │
│  │                   Browser Pool                            │  │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │  │
│  │   │ Chromium │  │ Chromium │  │ Chromium │  │  ...    │  │  │
│  │   └──────────┘  └──────────┘  └──────────┘  └─────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Templates: base | github | ...                                │
└─────────────────────────────────────────────────────────────────┘
```

## 核心特性

1. **浏览器池**：预热实例，减少启动开销
2. **动态负载控制**：根据CPU/内存/任务数动态调整
3. **多模板支持**：可扩展的模板系统
4. **JWT认证**：与Supabase Auth集成
5. **Realtime通知**：客户端实时感知PDF生成状态
