# docsvr PDF导出服务实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一个基于Gotenberg的PDF导出服务，支持Markdown转PDF（含数学公式）

**Architecture:** Edge Function → Doc Service (Hono) → Gotenberg → PDF → Supabase Storage

**Tech Stack:** Node.js 20, Hono, markdown-it, KaTeX, Gotenberg, Supabase

---

## Chunk 1: 项目初始化与基础结构

### Task 1: 初始化项目

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: 初始化npm项目并安装依赖**

```bash
npm init -y
npm install hono @supabase/supabase-js markdown-it katex
npm install -D typescript @types/node tsx vitest
```

- [ ] **Step 2: 创建tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: 创建.env.example**

```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOTENBERG_URL=http://localhost:3001
PORT=3000
```

- [ ] **Step 4: 创建.gitignore**

```
node_modules/
dist/
.env
*.log
```

- [ ] **Step 5: 更新package.json scripts**

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest"
  }
}
```

- [ ] **Step 6: 提交**

```bash
git add . && git commit -m "chore: initialize project with dependencies"
```

---

### Task 2: 创建类型定义

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: 创建类型定义文件**

```typescript
// src/types/index.ts
export interface User {
  id: string;
  email: string;
}

export interface PDFExportRequest {
  markdown: string;
  template?: 'base' | 'github' | 'exam';
  export_id: string;
  options?: PDFOptions;
}

export interface PDFOptions {
  format?: 'A4' | 'Letter';
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
}

export interface PDFExportResponse {
  success: boolean;
  data?: {
    export_id: string;
    storage_path: string;
    status: 'completed';
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface PDFTemplate {
  id: string;
  name: string;
  description: string;
  css: string;
  header?: string;
  footer?: string;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  services: {
    gotenberg: 'ok' | 'error';
    supabase: 'ok' | 'error';
  };
}
```

- [ ] **Step 2: 提交**

```bash
git add src/types/index.ts && git commit -m "feat: add type definitions"
```

---

## Chunk 2: 核心服务实现

### Task 3: Markdown解析服务

**Files:**
- Create: `src/services/markdown.ts`

- [ ] **Step 1: 创建Markdown解析服务**

```typescript
// src/services/markdown.ts
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

// 简单的KaTeX替换（行内 $...$ 和块级 $$...$$）
function replaceKatex(html: string): string {
  // 块级公式 $$...$$
  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, formula) => {
    return `<div class="katex-block">${formula.trim()}</div>`;
  });

  // 行内公式 $...$
  html = html.replace(/\$([^\$\n]+?)\$/g, (_, formula) => {
    return `<span class="katex-inline">${formula.trim()}</span>`;
  });

  return html;
}

export function parseMarkdown(content: string): string {
  const html = md.render(content);
  return replaceKatex(html);
}
```

- [ ] **Step 2: 提交**

```bash
git add src/services/markdown.ts && git commit -m "feat: add markdown parsing service with KaTeX placeholders"
```

---

### Task 4: 模板系统

**Files:**
- Create: `src/templates/base.ts`
- Create: `src/templates/github.ts`
- Create: `src/templates/exam.ts`
- Create: `src/templates/index.ts`

- [ ] **Step 1: 创建基础模板**

```typescript
// src/templates/base.ts
import type { PDFTemplate } from '../types';

export const baseTemplate: PDFTemplate = {
  id: 'base',
  name: '基础样式',
  description: '简洁的黑白样式',
  css: `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #24292f;
    }
    h1, h2, h3 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
    h1 { font-size: 2em; border-bottom: 1px solid #d0d7de; padding-bottom: .3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: .3em; }
    code { background: rgba(175,184,193,0.2); padding: 2px 6px; border-radius: 6px; font-size: 85%; }
    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #d0d7de; margin: 0; padding-left: 16px; color: #57606a; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #d0d7de; padding: 8px 12px; }
    th { background: #f6f8fa; }
    .katex-block { text-align: center; margin: 16px 0; font-size: 1.1em; }
    .katex-inline { font-style: italic; }
  `,
};
```

- [ ] **Step 2: 创建GitHub模板**

```typescript
// src/templates/github.ts
import type { PDFTemplate } from '../types';

export const githubTemplate: PDFTemplate = {
  id: 'github',
  name: 'GitHub风格',
  description: '仿GitHub markdown渲染',
  css: `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
      line-height: 1.6;
      max-width: 980px;
      margin: 0 auto;
      padding: 45px;
      background: #ffffff;
      color: #1f2328;
    }

    /* GitHub风格标题 */
    h1 { font-size: 32px; font-weight: 600; border-bottom: 1px solid #d0d7de; padding-bottom: .3em; margin: 24px 0 16px; }
    h2 { font-size: 24px; font-weight: 600; border-bottom: 1px solid #d0d7de; padding-bottom: .3em; margin: 24px 0 16px; }
    h3 { font-size: 20px; font-weight: 600; margin: 24px 0 16px; }
    h4 { font-size: 16px; font-weight: 600; margin: 24px 0 16px; }

    /* 代码块 */
    code { background: rgba(175,184,193,0.2); padding: .2em .4em; border-radius: 6px; font-size: 85%; font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace; }
    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; line-height: 1.45; }
    pre code { background: transparent; padding: 0; font-size: 85%; }

    /* 引用 */
    blockquote { border-left: .25em solid #d0d7de; margin: 16px 0; padding: 0 1em; color: #656d76; }

    /* 列表 */
    ul, ol { margin: 16px 0; padding-left: 2em; }
    li { margin: 4px 0; }

    /* 表格 */
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #d0d7de; padding: 8px 14px; }
    th { background: #f6f8fa; font-weight: 600; }

    /* 链接 */
    a { color: #0969da; text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* 数学公式 */
    .katex-block { text-align: center; margin: 20px 0; padding: 10px; background: #f6f8fa; border-radius: 6px; font-size: 1.1em; }
    .katex-inline { background: rgba(175,184,193,0.2); padding: 2px 6px; border-radius: 4px; }

    /* 分隔线 */
    hr { border: none; border-top: 1px solid #d0d7de; margin: 24px 0; }

    /* 图片 */
    img { max-width: 100%; height: auto; border-radius: 6px; }
  `,
};
```

- [ ] **Step 3: 创建试卷模板**

```typescript
// src/templates/exam.ts
import type { PDFTemplate } from '../types';

export const examTemplate: PDFTemplate = {
  id: 'exam',
  name: '试卷模板',
  description: '教育试卷专用，含密封线、答题区',
  css: `
    @page {
      size: A4;
      margin: 15mm;
    }

    body {
      font-family: 'SimSun', 'STSong', 'Songti SC', serif;
      font-size: 14px;
      line-height: 1.8;
      color: #000;
    }

    /* 试卷标题 */
    h1 {
      text-align: center;
      font-size: 22px;
      font-weight: bold;
      margin-bottom: 20px;
      border: none;
      padding: 0;
    }

    h2 {
      font-size: 16px;
      font-weight: bold;
      margin: 20px 0 10px;
      border: none;
      padding: 0;
    }

    /* 题目不拆分 */
    .question, li {
      page-break-inside: avoid;
      margin-bottom: 15px;
    }

    /* 选择题选项横排 */
    ul.options {
      display: flex;
      flex-wrap: wrap;
      list-style: none;
      padding: 0;
      margin: 10px 0;
    }
    ul.options li {
      width: 45%;
      margin: 5px 2.5%;
      padding: 0;
    }

    /* 答题区 */
    .answer-area {
      border: 1px solid #ccc;
      min-height: 100px;
      margin: 10px 0;
      padding: 10px;
    }

    /* 数学公式 */
    .katex-block {
      text-align: center;
      margin: 15px 0;
      font-size: 1.1em;
    }
    .katex-inline {
      font-style: normal;
    }

    /* 分数栏 */
    .score-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .score-table th, .score-table td {
      border: 1px solid #000;
      padding: 8px;
      text-align: center;
      width: 60px;
    }

    /* 页脚页码 */
    @page {
      @bottom-center {
        content: "第 " counter(page) " 页 共 " counter(pages) " 页";
        font-size: 12px;
      }
    }
  `,
};
```

- [ ] **Step 4: 创建模板注册表**

```typescript
// src/templates/index.ts
import type { PDFTemplate } from '../types';
import { baseTemplate } from './base';
import { githubTemplate } from './github';
import { examTemplate } from './exam';

export const templates: Record<string, PDFTemplate> = {
  base: baseTemplate,
  github: githubTemplate,
  exam: examTemplate,
};

export function getTemplate(id: string): PDFTemplate {
  return templates[id] || baseTemplate;
}

export function getTemplateList(): Array<{ id: string; name: string; description: string }> {
  return Object.values(templates).map(({ id, name, description }) => ({
    id,
    name,
    description,
  }));
}

export { baseTemplate, githubTemplate, examTemplate };
```

- [ ] **Step 5: 提交**

```bash
git add src/templates/ && git commit -m "feat: add PDF templates (base, github, exam)"
```

---

### Task 5: Gotenberg服务

**Files:**
- Create: `src/services/gotenberg.ts`

- [ ] **Step 1: 创建Gotenberg客户端**

```typescript
// src/services/gotenberg.ts
import type { PDFOptions } from '../types';

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'http://localhost:3001';

function mmToInch(mm: number): number {
  return mm / 25.4;
}

export async function generatePDF(html: string, options?: PDFOptions): Promise<Buffer> {
  const formData = new FormData();

  // HTML文件
  const htmlBlob = new Blob([html], { type: 'text/html' });
  formData.append('file', htmlBlob, 'index.html');

  // PDF选项
  const format = options?.format || 'A4';
  const paperWidth = format === 'A4' ? 8.27 : 8.5;
  const paperHeight = format === 'A4' ? 11.69 : 11;

  const margin = options?.margin || {};
  const marginTop = mmToInch(parseInt(margin.top || '20mm'));
  const marginBottom = mmToInch(parseInt(margin.bottom || '20mm'));
  const marginLeft = mmToInch(parseInt(margin.left || '15mm'));
  const marginRight = mmToInch(parseInt(margin.right || '15mm'));

  // Gotenberg API选项
  formData.append('paperWidth', paperWidth.toString());
  formData.append('paperHeight', paperHeight.toString());
  formData.append('marginTop', marginTop.toString());
  formData.append('marginBottom', marginBottom.toString());
  formData.append('marginLeft', marginLeft.toString());
  formData.append('marginRight', marginRight.toString());
  formData.append('printBackground', 'true');
  formData.append('preferCssPageSize', 'true');

  const response = await fetch(`${GOTENBERG_URL}/forms/chromium/convert/html`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Gotenberg error: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function checkGotenbergHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${GOTENBERG_URL}/health`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/services/gotenberg.ts && git commit -m "feat: add Gotenberg PDF generation service"
```

---

### Task 6: Supabase服务

**Files:**
- Create: `src/services/supabase.ts`

- [ ] **Step 1: 创建Supabase客户端**

```typescript
// src/services/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

export async function uploadPDF(
  userId: string,
  exportId: string,
  pdfBuffer: Buffer
): Promise<string> {
  const client = getSupabase();
  const path = `${userId}/${exportId}.pdf`;

  const { error } = await client.storage
    .from('pdf-exports')
    .upload(path, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return path;
}

export async function updateExportStatus(
  exportId: string,
  status: 'completed' | 'failed',
  storagePath?: string,
  errorMessage?: string
): Promise<void> {
  const client = getSupabase();

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'completed' && storagePath) {
    updateData.storage_path = storagePath;
    updateData.completed_at = new Date().toISOString();
  }

  if (status === 'failed' && errorMessage) {
    updateData.error_message = errorMessage;
  }

  const { error } = await client
    .from('pdf_export')
    .update(updateData)
    .eq('id', exportId);

  if (error) {
    throw new Error(`Database update failed: ${error.message}`);
  }
}

export async function checkSupabaseHealth(): Promise<boolean> {
  try {
    const client = getSupabase();
    const { error } = await client.from('pdf_export').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/services/supabase.ts && git commit -m "feat: add Supabase storage and database service"
```

---

## Chunk 3: API与中间件

### Task 7: JWT认证中间件

**Files:**
- Create: `src/middleware/auth.ts`

- [ ] **Step 1: 创建JWT认证中间件**

```typescript
// src/middleware/auth.ts
import { createMiddleware } from 'hono/factory';
import { verify } from 'hono/jwt';
import type { User } from '../types';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;

declare module 'hono' {
  interface ContextVariableMap {
    user: User;
  }
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
      },
      401
    );
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verify(token, JWT_SECRET);

    c.set('user', {
      id: payload.sub as string,
      email: payload.email as string,
    });

    await next();
  } catch (err) {
    return c.json(
      {
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Token verification failed' },
      },
      401
    );
  }
});
```

- [ ] **Step 2: 提交**

```bash
git add src/middleware/auth.ts && git commit -m "feat: add JWT authentication middleware"
```

---

### Task 8: PDF导出路由

**Files:**
- Create: `src/routes/pdf.ts`

- [ ] **Step 1: 创建PDF导出路由**

```typescript
// src/routes/pdf.ts
import { Hono } from 'hono';
import { parseMarkdown } from '../services/markdown';
import { generatePDF } from '../services/gotenberg';
import { uploadPDF, updateExportStatus } from '../services/supabase';
import { getTemplate, getTemplateList } from '../templates';
import type { PDFExportRequest, User } from '../types';

export const pdfRouter = new Hono();

// POST /api/v1/pdf/export
pdfRouter.post('/export', async (c) => {
  const user = c.get('user') as User;
  const body = await c.req.json<PDFExportRequest>();

  // 验证请求
  if (!body.markdown) {
    return c.json(
      {
        success: false,
        error: { code: 'INVALID_MARKDOWN', message: 'Markdown content is required' },
      },
      400
    );
  }

  if (!body.export_id) {
    return c.json(
      {
        success: false,
        error: { code: 'INVALID_EXPORT_ID', message: 'export_id is required' },
      },
      400
    );
  }

  try {
    // 1. 解析Markdown
    const contentHtml = parseMarkdown(body.markdown);

    // 2. 获取模板
    const template = getTemplate(body.template || 'base');

    // 3. 生成完整HTML
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PDF Export</title>
  <style>${template.css}</style>
</head>
<body>
  ${contentHtml}
</body>
</html>`;

    // 4. 生成PDF
    const pdfBuffer = await generatePDF(fullHtml, body.options);

    // 5. 上传到Storage
    const storagePath = await uploadPDF(user.id, body.export_id, pdfBuffer);

    // 6. 更新数据库状态
    await updateExportStatus(body.export_id, 'completed', storagePath);

    // 7. 返回成功响应
    return c.json({
      success: true,
      data: {
        export_id: body.export_id,
        storage_path: storagePath,
        status: 'completed',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // 尝试更新失败状态
    try {
      await updateExportStatus(body.export_id, 'failed', undefined, message);
    } catch {
      // 忽略数据库更新错误
    }

    return c.json(
      {
        success: false,
        error: { code: 'PDF_GENERATION_FAILED', message },
      },
      500
    );
  }
});

// GET /api/v1/pdf/templates
pdfRouter.get('/templates', (c) => {
  return c.json({
    templates: getTemplateList(),
  });
});
```

- [ ] **Step 2: 提交**

```bash
git add src/routes/pdf.ts && git commit -m "feat: add PDF export API routes"
```

---

### Task 9: 健康检查路由

**Files:**
- Create: `src/routes/health.ts`

- [ ] **Step 1: 创建健康检查路由**

```typescript
// src/routes/health.ts
import { Hono } from 'hono';
import { checkGotenbergHealth } from '../services/gotenberg';
import { checkSupabaseHealth } from '../services/supabase';

export const healthRouter = new Hono();

// GET /api/v1/health
healthRouter.get('/', async (c) => {
  const [gotenbergOk, supabaseOk] = await Promise.all([
    checkGotenbergHealth(),
    checkSupabaseHealth(),
  ]);

  const allHealthy = gotenbergOk && supabaseOk;

  return c.json(
    {
      status: allHealthy ? 'healthy' : 'unhealthy',
      services: {
        gotenberg: gotenbergOk ? 'ok' : 'error',
        supabase: supabaseOk ? 'ok' : 'error',
      },
    },
    allHealthy ? 200 : 503
  );
});
```

- [ ] **Step 2: 提交**

```bash
git add src/routes/health.ts && git commit -m "feat: add health check endpoint"
```

---

## Chunk 4: 应用入口与Docker

### Task 10: 应用入口

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: 创建应用入口**

```typescript
// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
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
const protectedApp = new Hono();
protectedApp.use('*', authMiddleware);
protectedApp.route('/pdf', pdfRouter);
app.route('/api/v1', protectedApp);

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

// 错误处理
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

console.log(`🚀 docsvr running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
```

- [ ] **Step 2: 提交**

```bash
git add src/index.ts && git commit -m "feat: add application entry point"
```

---

### Task 11: Docker配置

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`

- [ ] **Step 1: 创建Dockerfile**

```dockerfile
FROM node:20-slim

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制构建产物
COPY dist ./dist

# 环境变量
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: 创建docker-compose.yml**

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
      - PORT=3000
    depends_on:
      - gotenberg
    restart: unless-stopped

  gotenberg:
    image: gotenberg/gotenberg:8
    ports:
      - "3001:3000"
    restart: unless-stopped
```

- [ ] **Step 3: 提交**

```bash
git add Dockerfile docker-compose.yml && git commit -m "feat: add Docker configuration"
```

---

### Task 12: 最终构建与测试

- [ ] **Step 1: 构建项目**

```bash
npm run build
```

- [ ] **Step 2: 验证构建产物**

```bash
ls -la dist/
```

Expected: 看到所有编译后的 `.js` 文件

- [ ] **Step 3: 最终提交**

```bash
git add . && git commit -m "chore: final build and verify"
```

---

## 完成检查清单

- [ ] 项目结构正确
- [ ] 所有依赖已安装
- [ ] TypeScript编译无错误
- [ ] Docker配置完整
- [ ] 环境变量文档完整
