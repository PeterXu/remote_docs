# remote_docs 使用文档

## 概述

remote_docs 是 Gotenberg PDF 服务的轻量级封装，专注于：
- 多 Markdown 文档合并为单个 PDF
- 自动分页处理
- 直接返回 PDF 二进制流

## API 端点

### 健康检查

**GET** `/api/v1/pdf/health`

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

**GET** `/api/v1/pdf/ui`

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
    { "id": "exam", "name": "试卷模板", "description": "教育试卷专用" }
  ]
}
```

---

### 导出 PDF

**POST** `/api/v1/pdf/export`

将多个 Markdown 内容合并转换为 PDF，支持章节标题、配置选项等，直接返回 PDF 二进制流。

**请求头：**

```
Authorization: Bearer <your-supabase-jwt-token>
Content-Type: application/json
```

**请求体结构：**

```typescript
interface PDFExportRequest {
  // === 可选字段 ===

  // 文档配置（可选）- 内容相关
  config?: {
    caption?: string;          // 主标题
    subtitle?: string;         // 副标题
    copyright?: string;        // 版权信息（页脚）
    author?: string;           // 作者
    date?: string;             // 日期
  };

  // 模板 ID（可选，默认 "base"）
  template?: 'base' | 'github' | 'exam';

  // PDF 选项（可选）
  options?: {
    // === 页面设置 ===
    format?: 'A4' | 'Letter';  // 纸张格式（默认 "A4"）
    margin?: {
      top?: string;
      bottom?: string;
      left?: string;
      right?: string;
    };
    showPageNumber?: boolean;  // 显示页码（默认 true）
    pageNumberFormat?: string; // 页码格式（默认 "{page}"），支持 {page} 和 {total} 占位符

    // === 视觉效果 ===
    watermark?: {
      text: string;            // 水印文字（必需）
      opacity?: number;        // 透明度 0-1（默认 0.1）
      color?: string;          // 颜色（默认 "#999"）
      fontSize?: string;       // 字号（默认 "48px"）
      angle?: number;          // 旋转角度（默认 -30）
      density?: 'sparse' | 'normal' | 'dense';  // 密度（默认 "normal"）
    };

    // === 样式设置 ===
    cssVars?: Record<string, string>;  // CSS 变量覆盖
  };

  // === 必需字段 ===

  // 文档内容数组（必需，1-50 项）
  documents: string[];
}
```

**最小请求示例：**

```json
{
  "documents": [
    "# Hello\n\n最简单的请求。"
  ]
}
```

**可选功能组合：**

| 功能 | 是否必需 | 说明 |
|------|----------|------|
| `config` | ❌ 可选 | 全局配置，不传则无标题/版权等 |
| `documents` | ✅ 必需 | 字符串数组（1-50个），每个元素为 markdown 内容 |
| `template` | ❌ 可选 | 默认 "base" |
| `options` | ❌ 可选 | 默认 A4 纸张 |
| `<!-- PAGE_BREAK -->` | ❌ 可选 | 在 markdown 中使用此注释强制分页 |

**强制分页语法：**

在 markdown 内容中使用 `<!-- PAGE_BREAK -->` 可以强制分页：

```json
{
  "documents": [
    "# 第一章\n\n这是第一章的内容。",
    "<!-- PAGE_BREAK -->",
    "# 第二章\n\n这是新的一页，第二章的内容。"
  ]
}
```

**请求示例：**

**示例 1: 最小请求（无配置、无章节）**

```json
{
  "documents": [
    {
      "items": ["# 标题\n\n内容..."]
    }
  ]
}
```

**示例 2: 带配置的文档**

```json
{
  "config": {
    "caption": "项目文档",
    "copyright": "My Company",
    "author": "John Doe"
  },
  "documents": [
    "# 项目介绍\n\n这是项目的介绍内容。",
    "## 主要功能\n\n- 功能一\n- 功能二"
  ],
  "template": "github"
}
```

**示例 3: 带章节的文档（使用 markdown 标题）**

```json
{
  "config": {
    "caption": "产品文档"
  },
  "documents": [
    "# 第一部分：概述\n\n这是介绍内容...",
    "<!-- PAGE_BREAK -->",
    "# 第二部分：技术\n\n这是技术内容..."
  ]
}
```

**示例 4: 多个文档项**

```json
{
  "documents": [
    "# 第一部分\n\n内容 A",
    "# 第二部分\n\n内容 B",
    "# 第三部分\n\n内容 C"
  ]
}
```

**示例 5: 带水印的文档**

```json
{
  "config": {
    "caption": "内部文档"
  },
  "options": {
    "watermark": {
      "text": "内部资料",
      "opacity": 0.08,
      "color": "#ff0000",
      "fontSize": "60px",
      "angle": -30,
      "density": "normal"
    }
  },
  "documents": [
    "# 绝密\n\n这是内部资料。"
  ]
}
```

**示例 6: 自定义页码格式**

```json
{
  "config": {
    "caption": "项目文档",
    "copyright": "© 2025 公司内部资料"
  },
  "options": {
    "showPageNumber": true,
    "pageNumberFormat": "第 {page} 页"
  },
  "documents": [
    "# 第一章\n\n内容...",
    "# 第二章\n\n内容..."
  ]
}
```

页脚将显示: `© 2025 公司内部资料 | 第 1 页`

**示例 7: 试卷示例**

```json
{
  "config": {
    "caption": "2024年第一学期期末考试",
    "subtitle": "数学试卷",
    "copyright": "XX学校",
    "date": "2024-03-21"
  },
  "options": {
    "showPageNumber": true
  },
  "documents": [
    "# 第一部分：题目\n\n## 一、选择题（每题 5 分，共 30 分）\n\n**1. 下列哪个是质数？**\n\n- A. 1\n- B. 2\n- C. 4\n- D. 6\n\n**2. 设 $f(x) = x^2 - 3x + 2$，则 $f(2) = $**\n\n- A. 0\n- B. 1\n- C. 2\n- D. 4",
    "## 二、填空题（每题 10 分，共 20 分）\n\n**1.** 勾股定理的内容是：$a^2 + b^2 = $ `__________`\n\n**2.** 一元二次方程的求根公式是 $x = $ `__________`",
    "<!-- PAGE_BREAK -->",
    "# 第二部分：参考答案\n\n## 一、选择题答案\n\n1. B (2 是质数)\n2. A (f(2) = 4 - 6 + 2 = 0)"
  ],
  "template": "exam",
  "options": {
    "cssVars": {
      "font-size-body": "16px",
      "line-height": "2.0"
    }
  }
}
```

**分页规则：**

1. **config 部分**：显示在文档首页（如果有 config）
2. **文档内容**：所有 items 按顺序拼接渲染
3. **强制分页**：在 markdown 中使用 `<!-- PAGE_BREAK -->` 可强制开始新页面
4. **自然分页**：内容超出一页时自动分页

**参数说明：**

| 字段 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `config` | object | ❌ | - | 文档配置对象 |
| `config.caption` | string | ❌ | - | 文档主标题 |
| `config.subtitle` | string | ❌ | - | 副标题 |
| `config.copyright` | string | ❌ | - | 版权信息（显示在页脚） |
| `config.author` | string | ❌ | - | 作者信息 |
| `config.date` | string | ❌ | - | 日期（格式 YYYY-MM-DD） |
| `template` | string | ❌ | `"base"` | 模板 ID：`base`、`github`、`exam` |
| `options` | object | ❌ | - | PDF 选项 |
| `options.format` | string | ❌ | `"A4"` | 纸张格式：`A4` 或 `Letter` |
| `options.margin` | object | ❌ | - | 页边距配置 |
| `options.showPageNumber` | boolean | ❌ | `true` | 是否显示页码 |
| `options.pageNumberFormat` | string | ❌ | `"{page}"` | 页码格式，支持占位符：`{page}` (当前页)、`{total}` (总页数) |
| `options.watermark` | object | ❌ | - | 水印配置 |
| `options.watermark.text` | string | ❌* | - | 水印文字（使用水印时必需） |
| `options.watermark.opacity` | number | ❌ | `0.1` | 透明度 0-1 |
| `options.watermark.color` | string | ❌ | `"#999"` | 颜色 |
| `options.watermark.fontSize` | string | ❌ | `"48px"` | 字号 |
| `options.watermark.angle` | number | ❌ | `-30` | 旋转角度（度） |
| `options.watermark.density` | string | ❌ | `"normal"` | 密度：`sparse`/`normal`/`dense` |
| `options.cssVars` | object | ❌ | - | CSS 变量覆盖 |
| `documents` | array | ✅ | - | 字符串数组（1-50个），每个元素为 markdown 内容 |

* 使用水印时 `text` 必需

**限制：**
- 最大 50 个文档项
- 总内容大小不超过 10MB
- 请求体不超过 15MB

**注意事项：**
- `{total}` 占位符（总页数）在某些 PDF 引擎中可能不支持，建议仅使用 `{page}`
- 页脚内容通过 CSS `content` 属性实现，复杂格式可能受限

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
| `INVALID_REQUEST` | 400 | 请求格式错误（缺少 documents、项类型错误等） |
| `EMPTY_DOCUMENTS` | 400 | documents 数组为空 |
| `TOO_MANY_DOCUMENTS` | 400 | 超过 50 个文档项 |
| `PAYLOAD_TOO_LARGE` | 413 | 请求体超过 15MB 或内容超过 10MB |
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

// 类型定义
interface PDFExportRequest {
  config?: {  // 可选
    caption?: string;
    subtitle?: string;
    copyright?: string;
    author?: string;
    date?: string;
  };
  documents: string[];  // 必需
  template?: 'base' | 'github' | 'exam';  // 可选，默认 'base'
  options?: {  // 可选
    format?: 'A4' | 'Letter';
    margin?: { top?: string; bottom?: string; left?: string; right?: string; };
    showPageNumber?: boolean;
    pageNumberFormat?: string;
    watermark?: {
      text: string;
      opacity?: number;
      color?: string;
      fontSize?: string;
      angle?: number;
      density?: 'sparse' | 'normal' | 'dense';
    };
    cssVars?: Record<string, string>;
  };
}

async function exportPDF(request: PDFExportRequest) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('未登录');

  const response = await fetch('https://your-remote-docs-server/api/v1/pdf/export', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  const pdfBlob = await response.blob();
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');
  return url;
}

// 示例 1: 最小请求（无配置）
const minimalPdf = await exportPDF({
  documents: [
    { items: ['# Hello\n\n最简单的请求'] }
  ]
});

// 示例 2: 带配置的文档
const pdfUrl = await exportPDF({
  config: {
    caption: '技术文档',
    copyright: 'My Company',
    author: 'John Doe'
  },
  documents: [
    '# 第一章：概述\n\n这是项目介绍。',
    '## 功能\n\n- 功能一\n- 功能二'
  ],
  template: 'github'
});

// 示例 3: 试卷示例
const examPdf = await exportPDF({
  config: {
    caption: '期中考试',
    subtitle: '数学试卷',
    copyright: 'XX学校',
    date: new Date().toISOString().split('T')[0]
  },
  documents: [
    '# 第一部分：题目\n\n## 一、选择题\n\n**1. 下列哪个是质数？**\n\n- A. 1\n- B. 2\n- C. 4',
    '<!-- PAGE_BREAK -->',
    '# 第二部分：答案\n\n1. B (2 是质数)'
  ],
  template: 'exam'
});

// 示例 4: 简单列表
const simplePdf = await exportPDF({
  documents: [
    '# 第一部分\n\n内容 A',
    '# 第二部分\n\n内容 B',
    '# 第三部分\n\n内容 C'
  ]
});

// 示例 5: 带水印的机密文档
const confidentialPdf = await exportPDF({
  config: {
    caption: '机密文档'
  },
  options: {
    watermark: {
      text: '内部资料',
      opacity: 0.08,
      color: '#ff0000',
      fontSize: '60px',
      angle: -30,
      density: 'normal'
    }
  },
  documents: [
    '# 绝密\n\n这是内部资料，请勿外传。'
  ]
});
```

### Supabase Edge Function 集成

```typescript
// supabase/functions/pdf-proxy/index.ts
import { createClient } from '@supabase/supabase-js';

interface DocumentItem = string;

interface PDFRequest {
  config?: {
    caption?: string;
    copyright?: string;
    author?: string;
  };
  documents: string[];
  template?: 'base' | 'github' | 'exam';
  options?: {
    format?: 'A4' | 'Letter';
    margin?: { top?: string; bottom?: string; left?: string; right?: string; };
  };
}

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
  const body = await req.json() as PDFRequest;

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
curl http://localhost:3000/api/v1/pdf/health

# 访问 Web 管理界面
open http://localhost:3000/api/v1/pdf/ui

# 获取模板列表
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/pdf/templates

# 导出简单 PDF
curl -X POST http://localhost:3000/api/v1/pdf/export \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "caption": "技术文档",
      "copyright": "My Company"
    },
    "documents": [
      "# 第一章：概述\n\n这是项目介绍。"
    ],
    "template": "github"
  }' \
  -o output.pdf

# 导出试卷 PDF
curl -X POST http://localhost:3000/api/v1/pdf/export \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "caption": "期中考试",
      "subtitle": "数学试卷",
      "copyright": "XX学校"
    },
    "documents": [
      "# 第一部分：题目\n\n## 一、选择题\n\n**1. 下列哪个是质数？**\n\n- A. 1\n- B. 2\n- C. 4"
    ],
    "template": "exam"
  }' \
  -o exam.pdf

# 导出带水印的 PDF
curl -X POST http://localhost:3000/api/v1/pdf/export \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "caption": "机密文档"
    },
    "options": {
      "watermark": {
        "text": "内部资料",
        "opacity": 0.08,
        "color": "#ff0000",
        "fontSize": "60px",
        "angle": -30,
        "density": "normal"
      }
    },
    "documents": [
      "# 绝密\n\n这是内部资料。"
    ]
  }' \
  -o confidential.pdf
```

---

## Markdown 语法支持

### 强制分页

在 markdown 中使用以下语法强制分页：

```markdown
<!-- PAGE_BREAK -->
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
- 填空下划线
- 分数栏、注意事项框

**CSS 变量配置**（通过 `options.cssVars` 覆盖）：

```json
{
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
  "documents": [
    "# 数学试卷\n\n## 考生信息\n\n**姓名:** `__________` **班级:** `__________` **学号:** `__________`\n\n---\n\n## 注意事项\n\n> ⚠️ 考试须知\n>\n> 1. 本试卷共 4 页,满分 100 分,考试时间 120 分钟.\n> 2. 请用黑色签字笔答题,字迹工整.\n\n---\n\n## 一、选择题(每题 5 分,共 30 分)\n\n**1. 下列哪个是质数?**\n\n- A. 1\n- B. 2\n- C. 4\n- D. 6\n\n**2. 设 $f(x) = x^2 - 3x + 2$, 则 $f(2) = $\n\n- A. 0\n- B. 1\n- C. 2\n- D. 4\n"
  ],
  "template": "exam"
}
```

---

## 分页行为

1. **默认行为**：内容按顺序拼接，自然分页
2. **强制分页**：在 markdown 中使用 `<!-- PAGE_BREAK -->` 强制开始新页面
3. **config 区域**：如果有 config，显示在文档首页

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
