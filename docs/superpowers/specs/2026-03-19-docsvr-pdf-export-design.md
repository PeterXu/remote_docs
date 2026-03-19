# docsvr - PDF导出服务设计文档

## 概述

docsvr是一个文档处理服务，使用 **Gotenberg** 渲染PDF，支持Markdown转PDF（含LaTeX数学公式），上传至Supabase Storage，并通过Realtime通知用户。

## 架构设计

```
[ Supabase Edge Function ]
            ↓ (HTTP + JWT)
[ Doc Service（Node + Hono） ]
  - Markdown 解析（markdown-it）
  - 数学公式渲染（KaTeX）
  - 套用 HTML 模板
            ↓ (HTTP)
[ Gotenberg ]
            ↓
          PDF
            ↓
[ Supabase Storage ] + [ pdf-export 表更新 ]
            ↓
[ Realtime 通知用户 ]
```

## 技术选型

| 组件 | 技术 |
|------|------|
| 运行时 | Node.js 20 |
| Web框架 | Hono |
| PDF渲染 | Gotenberg（基于Chromium） |
| Markdown解析 | markdown-it |
| 数学公式 | KaTeX |
| 样式模板 | github-markdown-css |
| 数据库客户端 | @supabase/supabase-js |
| JWT验证 | hono/jwt |
| 部署 | Docker Compose |

## 项目结构

```
docsvr/
├── src/
│   ├── index.ts              # 入口，Hono应用
│   ├── routes/
│   │   ├── pdf.ts            # PDF导出API
│   │   └── health.ts         # 健康检查
│   ├── services/
│   │   ├── gotenberg.ts      # Gotenberg客户端
│   │   ├── supabase.ts       # Supabase客户端
│   │   └── markdown.ts       # Markdown解析服务
│   ├── templates/
│   │   ├── base.ts           # 基础样式
│   │   ├── github.ts         # GitHub风格样式
│   │   ├── exam.ts           # 试卷模板
│   │   └── index.ts          # 模板注册表
│   ├── middleware/
│   │   └── auth.ts           # JWT验证中间件
│   └── types/
│       └── index.ts          # 类型定义
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

## API接口设计

### POST /api/v1/pdf/export

**请求头**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**请求体**
```json
{
  "markdown": "# Title\n\nContent with $E=mc^2$ formula...",
  "template": "github",
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
    "storage_path": "pdfs/user_id/2026/03/export_id.pdf",
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

```json
{
  "status": "healthy",
  "services": {
    "gotenberg": "ok",
    "supabase": "ok"
  }
}
```

### GET /api/v1/templates

返回可用模板列表。

```json
{
  "templates": [
    { "id": "base", "name": "基础样式", "description": "简洁的黑白样式" },
    { "id": "github", "name": "GitHub风格", "description": "仿GitHub markdown渲染" },
    { "id": "exam", "name": "试卷模板", "description": "教育试卷专用，含密封线、答题区" }
  ]
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

CREATE INDEX idx_pdf_export_user ON pdf_export(user_id);
CREATE INDEX idx_pdf_export_status ON pdf_export(status);

-- Realtime启用
ALTER PUBLICATION supabase_realtime ADD TABLE pdf_export;
```

### Storage Bucket

```
Bucket: pdf-exports
├── {user_id}/
│   └── {export_id}.pdf
```

## Markdown解析与模板系统

### Markdown解析配置

```typescript
import MarkdownIt from 'markdown-it';
import katex from 'katex';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

// KaTeX 行内公式 $...$
// KaTeX 块级公式 $$...$$
```

### 模板系统

```typescript
interface PDFTemplate {
  id: string;
  name: string;
  description: string;
  css: string;
  header?: string;
  footer?: string;
}

const templates: Record<string, PDFTemplate> = {
  base: {
    id: 'base',
    name: '基础样式',
    css: `body { font-family: system-ui; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }`
  },
  github: {
    id: 'github',
    name: 'GitHub风格',
    css: `@import 'github-markdown-css'; .markdown-body { max-width: 800px; margin: 0 auto; }`
  },
  exam: {
    id: 'exam',
    name: '试卷模板',
    css: `
      @page { margin: 15mm; }
      body { font-family: 'SimSun', serif; }
      .question { page-break-inside: avoid; margin-bottom: 20px; }
      .answer-area { border: 1px solid #ccc; min-height: 100px; }
    `
  }
};
```

### PDF生成配置

```typescript
const gotenbergOptions = {
  paperWidth: 8.27,   // A4
  paperHeight: 11.69,
  marginTop: 0.787,   // 20mm in inches
  marginBottom: 0.787,
  marginLeft: 0.591,  // 15mm
  marginRight: 0.591,
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: '<div style="font-size: 10px; text-align: center; width: 100%;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
};
```

## JWT认证

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

## 环境变量

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gotenberg
GOTENBERG_URL=http://gotenberg:3000

# 服务
PORT=3000
NODE_ENV=production
```

## Docker部署

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
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - GOTENBERG_URL=http://gotenberg:3000
    depends_on:
      - gotenberg
    restart: unless-stopped

  gotenberg:
    image: gotenberg/gotenberg:8
    ports:
      - "3001:3000"
    restart: unless-stopped
```

### Dockerfile

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

## 核心特性

1. **Gotenberg渲染**：无需管理浏览器池，稳定可靠
2. **KaTeX数学公式**：高质量矢量渲染
3. **多模板支持**：基础/GitHub/试卷三种模板
4. **JWT认证**：与Supabase Auth集成
5. **Realtime通知**：客户端实时感知PDF生成状态
6. **Docker部署**：一键启动完整服务栈
