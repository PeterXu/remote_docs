# remote_docs 使用文档

## 概述

remote_docs 是 Gotenberg PDF 服务的轻量级封装，专注于：
- 多 Markdown 文档合并为单个 PDF
- 自动分页处理
- 直接返回 PDF 二进制流

## API 端点

### 健康检查

**GET** `/api/v1/health`

检查服务状态，无需认证。

**响应示例：**

```json
{
  "status": "healthy",
  "services": {
    "gotenberg": "ok"
  }
}
```

---

### 获取模板列表

**GET** `/api/v1/pdf/templates`

获取可用的 PDF 模板列表，需要认证。

**请求头：**

```
Authorization: Bearer <your-supabase-jwt-token>
```

**响应示例：**

```json
{
  "templates": [
    { "id": "base", "name": "基础样式", "description": "简洁的黑白样式" },
    { "id": "github", "name": "GitHub风格", "description": "仿GitHub markdown渲染" },
    { "id": "exam", "name": "试卷模板", "description": "教育试卷专用，含密封线、答题区" }
  ]
}
```

---

### 导出 PDF

**POST** `/api/v1/pdf/export`

将多个 Markdown 文档合并转换为 PDF，直接返回 PDF 二进制流。

**请求头：**

```
Authorization: Bearer <your-supabase-jwt-token>
Content-Type: application/json
```

**请求体：**

```json
{
  "documents": [
    { "title": "第一章", "markdown": "# 内容..." },
    { "title": "第二章", "markdown": "## 更多内容..." }
  ],
  "template": "github",
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

**参数说明：**

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `documents` | array | 是 | 文档数组（1-50个） |
| `documents[].title` | string | 否 | 文档标题（显示为章节标题） |
| `documents[].markdown` | string | 是 | Markdown 内容 |
| `template` | string | 否 | 模板 ID：`base`、`github`、`exam`，默认 `base` |
| `options` | object | 否 | PDF 选项 |
| `options.format` | string | 否 | 纸张格式：`A4`（默认）、`Letter` |
| `options.margin` | object | 否 | 页边距设置 |

**限制：**
- 最大 50 个文档
- 总 Markdown 大小不超过 10MB
- 请求体不超过 15MB

**成功响应：**

- 状态码：`200`
- Content-Type：`application/pdf`
- Body：PDF 二进制流

**错误响应：**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

**错误码：**

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| `UNAUTHORIZED` | 401 | 缺少或无效的认证头 |
| `INVALID_TOKEN` | 401 | JWT 令牌验证失败 |
| `INVALID_JSON` | 400 | 请求体不是有效的 JSON |
| `INVALID_REQUEST` | 400 | 缺少 documents 数组 |
| `EMPTY_DOCUMENTS` | 400 | documents 数组为空 |
| `TOO_MANY_DOCUMENTS` | 400 | 超过 50 个文档 |
| `PAYLOAD_TOO_LARGE` | 413 | 请求体超过 15MB |
| `INVALID_TEMPLATE` | 400 | 模板 ID 不存在 |
| `PDF_GENERATION_FAILED` | 500 | PDF 生成失败 |

---

## 使用示例

### JavaScript/TypeScript 客户端

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);

async function exportPDF(documents: Array<{ title?: string; markdown: string }>) {
  // 获取用户令牌
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('未登录');

  // 调用 remote_docs API
  const response = await fetch('https://your-remote-docs-server/api/v1/pdf/export', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      documents,
      template: 'github'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  // 获取 PDF Blob
  const pdfBlob = await response.blob();

  // 下载或显示 PDF
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');

  return url;
}

// 使用示例
const pdfUrl = await exportPDF([
  { title: '第一章 简介', markdown: '# 简介\n\n这是第一章内容。' },
  { title: '第二章 详情', markdown: '## 详细说明\n\n这是第二章内容。' }
]);
```

### Supabase Edge Function 集成

```typescript
// supabase/functions/pdf-proxy/index.ts
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: Request) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  // 验证用户
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // 转发请求到 remote_docs
  const body = await req.json();

  const response = await fetch(`${REMOTE_DOCS_URL}/api/v1/pdf/export`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  // 直接返回 PDF 流
  return new Response(response.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="export.pdf"'
    }
  });
}
```

### cURL 示例

```bash
# 导出 PDF
curl -X POST http://localhost:3000/api/v1/pdf/export \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      { "title": "文档一", "markdown": "# Hello\n\n这是第一个文档。" },
      { "title": "文档二", "markdown": "## 第二部分\n\n这是第二个文档。" }
    ],
    "template": "github"
  }' \
  -o output.pdf

# 健康检查
curl http://localhost:3000/api/v1/health

# 获取模板列表
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/pdf/templates
```

---

## Markdown 语法支持

### 基础语法

```markdown
# 一级标题
## 二级标题
### 三级标题

**粗体** *斜体* ~~删除线~~

- 无序列表项 1
- 无序列表项 2

1. 有序列表项 1
2. 有序列表项 2

> 引用内容

[链接文本](https://example.com)

`行内代码`

​```
代码块
​```
```

### 表格

```markdown
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 数据 | 数据 | 数据 |
```

### 数学公式（KaTeX）

**行内公式：**

```markdown
质能方程 $E = mc^2$ 揭示了质量和能量的关系。
```

**块级公式：**

```markdown
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```

---

## 模板说明

### base - 基础样式

简洁的黑白样式，适合一般文档。

### github - GitHub 风格

模拟 GitHub Markdown 渲染效果，适合技术文档和 README。

### exam - 试卷模板

专为教育试卷设计，包含：
- 宋体字体
- 题目不跨页
- 答题区样式

---

## 分页行为

每个文档（documents 数组中的元素）会自动开始新的一页。最后一个文档不会添加多余的空白页。

```
┌─────────────┐
│  文档 1     │
│             │
├─────────────┤  ← 自动分页
│  文档 2     │
│             │
├─────────────┤  ← 自动分页
│  文档 3     │
│             │
└─────────────┘
```

---

## 工作流程

```
┌─────────────────┐
│   客户端应用     │
│ (Supabase Auth) │
└────────┬────────┘
         │ 1. POST /api/v1/pdf/export (JWT + documents)
         ▼
┌─────────────────┐
│   remote_docs   │
│                 │
│ 2. 验证 JWT     │
│ 3. 解析 Markdown│
│ 4. 合并 HTML    │
│ 5. 添加分页     │
└────────┬────────┘
         │ 6. 发送 HTML
         ▼
┌─────────────────┐
│   Gotenberg     │
│                 │
│ 7. 渲染 PDF     │
└────────┬────────┘
         │ 8. 返回 PDF
         ▼
┌─────────────────┐
│   客户端应用     │
│                 │
│ 9. 接收 PDF 流  │
└─────────────────┘
```

---

## 注意事项

1. **认证**：所有 PDF 相关接口需要有效的 Supabase JWT 令牌
2. **文档数量**：最多 50 个文档
3. **文件大小**：总 Markdown 不超过 10MB，请求体不超过 15MB
4. **超时**：PDF 生成默认超时 60 秒
5. **并发**：Gotenberg 单实例并发约 5-10，建议生产环境多实例部署
6. **安全**：禁用原始 HTML 标签，仅支持 Markdown 语法
