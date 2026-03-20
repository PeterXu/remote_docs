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

### Web 管理界面

**GET** `/ui`

提供可视化的 PDF 生成界面，无需认证即可访问页面（但生成 PDF 仍需 JWT Token）。

**功能：**
- 输入 JWT Token 进行认证
- 添加多个 Markdown 文档
- 选择模板和页面设置
- 实时生成并下载 PDF

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

**试卷模板 CSS 变量示例：**

```json
{
  "documents": [{ "markdown": "# 期中考试\n\n## 一、选择题\n\n..." }],
  "template": "exam",
  "options": {
    "cssVars": {
      "font-size-body": "16px",
      "line-height": "2.0",
      "question-gap": "25px"
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
| `options.cssVars` | object | 否 | CSS 变量覆盖（仅 exam 模板） |

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
# 健康检查
curl http://localhost:3000/api/v1/health

# 访问 Web 管理界面
open http://localhost:3000/ui

# 获取模板列表
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/pdf/templates

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
- 宋体/黑体字体
- 题目不跨页（page-break-inside: avoid）
- 自动题号（一、二、三 / 1. 2. 3. / (1)(2)(3)）
- 答题区样式（可配置高度）
- 填空下划线
- 分数栏、考生信息栏、注意事项框

**CSS 变量配置**（通过 `options.cssVars` 覆盖）：

```json
{
  "template": "exam",
  "options": {
    "cssVars": {
      "font-size-body": "16px",
      "line-height": "2.0",
      "question-gap": "25px",
      "answer-min-height": "120px"
    }
  }
}
```

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `font-size-body` | 14px | 正文字号 |
| `font-size-title` | 22px | 试卷标题字号 |
| `font-size-h2` | 16px | 大题标题字号 |
| `font-size-h3` | 14px | 小题标题字号 |
| `line-height` | 1.8 | 行高 |
| `paragraph-gap` | 10px | 段落间距 |
| `question-gap` | 18px | 题目间距 |
| `option-gap` | 8px | 选项间距 |
| `answer-min-height` | 80px | 答题区最小高度 |
| `answer-bg-color` | #fafafa | 答题区背景色 |
| `border-color` | #000 | 边框颜色 |
| `border-light` | #ccc | 浅色边框 |
| `option-bg-color` | #f8f8f8 | 选项背景色 |

---

## 试卷示例

以下是使用 exam 模板的完整试卷示例：

### 选择题
使用 Markdown 列表语法，选项会自动横排显示（两列布局，带背景色）：

```markdown
**1. 下列哪个是质数？**

- A. 1
- B. 2
- C. 4
- D. 6
```

### 填空题
使用反引号包裹下划线 `__________` 可避免显示效果问题

```markdown
**1.** 勾股定理的内容是： $a^2 + b^2 = $ `__________`

**2.** 一元二次方程 $ax^2 + bx + c = 0$ 的求根公式是 $x = $ `__________`
```

### 计算题
直接写公式即可，支持 LaTeX 语法
```markdown
**1.** 计算: $\\\\int_0^1 x^2 dx$

**2.** 解方程: $x^2 - 5x + 6 = 0$
```

### 应用题
直接用段落描述问题场景
```markdown
某商店举行促销活动，商品原价为 200 元，现打 8 折出售。如果再购买 3 件以上，还可以再打 9 折。小明买了 5 件,一共需要付多少钱？
```

### 完整示例
```json
{
  "documents": [{
    "title": "2024年第一学期期末考试",
    "markdown": "# 数学试卷\n\n## 考生信息\n\n**姓名:** `__________` **班级:** `__________` **学号:** `__________`\n\n---\n\n## 注意事项\n\n> ⚠️ 考试须知\n>\n> 1. 本试卷共 4 页,满分 100 分,考试时间 120 分钟.\n> 2. 请用黑色签字笔答题,字迹工整.\n\n---\n\n## 一、选择题(每题 5 分,共 30 分)\n\n**1. 下列哪个是质数?**\n\n- A. 1\n- B. 2\n- C. 4\n- D. 6\n\n**2. 设 $f(x) = x^2 - 3x + 2$, 则 $f(2) = $\n\n- A. 0\n- B. 1\n- C. 2\n- D. 4\n"
  }],
  "template": "exam"
}
```

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
