# DocSVR 使用文档

## 概述

DocSVR 是一个 Markdown 转 PDF 的文档服务，支持：

- Markdown 解析（含 GitHub Flavored Markdown）
- LaTeX 数学公式渲染（KaTeX）
- 多种 PDF 模板（基础、GitHub 风格、试卷）
- Supabase 存储集成
- JWT 认证

## API 端点

### 健康检查

**GET** `/api/v1/health`

检查服务状态，无需认证。

**响应示例：**

```json
{
  "status": "healthy",
  "services": {
    "gotenberg": "ok",
    "supabase": "ok"
  }
}
```

状态码：
- `200` - 所有服务正常
- `503` - 部分服务异常

---

### 获取模板列表

**GET** `/api/v1/pdf/templates`

获取可用的 PDF 模板列表，需要认证。

**请求头：**

```
Authorization: Bearer <your-jwt-token>
```

**响应示例：**

```json
{
  "templates": [
    {
      "id": "base",
      "name": "基础样式",
      "description": "简洁的黑白样式"
    },
    {
      "id": "github",
      "name": "GitHub风格",
      "description": "仿GitHub markdown渲染"
    },
    {
      "id": "exam",
      "name": "试卷模板",
      "description": "教育试卷专用，含密封线、答题区"
    }
  ]
}
```

---

### 导出 PDF

**POST** `/api/v1/pdf/export`

将 Markdown 内容转换为 PDF 并上传到 Supabase Storage，需要认证。

**请求头：**

```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**请求体：**

```json
{
  "markdown": "# 标题\n\n这是内容...",
  "template": "github",
  "export_id": "uuid-of-export-record",
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
| `markdown` | string | 是 | Markdown 内容 |
| `template` | string | 否 | 模板 ID：`base`、`github`、`exam`，默认 `base` |
| `export_id` | string | 是 | 导出记录 ID（需预先在数据库创建） |
| `options` | object | 否 | PDF 选项 |
| `options.format` | string | 否 | 纸张格式：`A4`（默认）、`Letter` |
| `options.margin` | object | 否 | 页边距设置 |

**成功响应（200）：**

```json
{
  "success": true,
  "data": {
    "export_id": "uuid-of-export-record",
    "storage_path": "user-id/uuid-of-export-record.pdf",
    "status": "completed"
  }
}
```

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
| `INVALID_MARKDOWN` | 400 | 缺少 markdown 内容 |
| `INVALID_EXPORT_ID` | 400 | 缺少 export_id |
| `PDF_GENERATION_FAILED` | 500 | PDF 生成失败 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

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

![图片描述](https://example.com/image.png)

---

`行内代码`

​```javascript
// 代码块
console.log('Hello, World!');
​```
```

### 表格

```markdown
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 数据 | 数据 | 数据 |
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

**常用公式示例：**

```markdown
# 数学公式示例

## 分数
$\frac{a}{b}$

## 根号
$\sqrt{x^2 + y^2}$

## 求和
$$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$$

## 积分
$$\int_a^b f(x) \, dx$$

## 矩阵
$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
$$

## 希腊字母
$\alpha, \beta, \gamma, \delta, \epsilon$
```

---

## 模板说明

### base - 基础样式

简洁的黑白样式，适合一般文档。

特点：
- 干净的排版
- 代码块语法高亮背景
- 适合技术文档

### github - GitHub 风格

模拟 GitHub Markdown 渲染效果。

特点：
- GitHub 风格标题边框
- 系统字体栈
- 适合 README、文档

### exam - 试卷模板

专为教育试卷设计。

特点：
- 宋体字体
- 题目不拆分（page-break-inside: avoid）
- 支持密封线、答题区
- 选择题选项横排布局
- 适合试卷、答题卡

**试卷专用 CSS 类：**

```html
<!-- 答题区 -->
<div class="answer-area"></div>

<!-- 填空下划线 -->
<span class="blank"></span>

<!-- 分数栏表格 -->
<table class="score-table">...</table>

<!-- 考生信息栏 -->
<div class="student-info">
  <span>姓名：<span class="blank"></span></span>
  <span>学号：<span class="blank"></span></span>
</div>

<!-- 注意事项 -->
<div class="notice">
  <div class="notice-title">注意事项</div>
  <p>1. 本试卷共 X 页</p>
</div>

<!-- 选择题选项 -->
<ul class="options">
  <li>A. 选项A</li>
  <li>B. 选项B</li>
  <li>C. 选项C</li>
  <li>D. 选项D</li>
</ul>
```

---

## 完整使用示例

### JavaScript/TypeScript 客户端

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);

async function exportPDF(markdown: string) {
  // 1. 获取用户令牌
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('未登录');

  // 2. 创建导出记录
  const { data: exportRecord, error: createError } = await supabase
    .from('pdf_export')
    .insert({
      user_id: session.user.id,
      status: 'pending'
    })
    .select()
    .single();

  if (createError) throw createError;

  // 3. 调用 DocSVR API
  const response = await fetch('http://localhost:3000/api/v1/pdf/export', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      markdown,
      template: 'github',
      export_id: exportRecord.id,
      options: {
        format: 'A4',
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
      }
    })
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error.message);
  }

  // 4. 获取 PDF 下载 URL
  const { data: { publicUrl } } = supabase.storage
    .from('pdf-exports')
    .getPublicUrl(result.data.storage_path);

  return publicUrl;
}

// 使用示例
const pdfUrl = await exportPDF(`
# 数学试卷

## 一、选择题

1. 已知 $x + y = 10$，$x - y = 2$，则 $x = $？

<ul class="options">
  <li>A. 4</li>
  <li>B. 6</li>
  <li>C. 8</li>
  <li>D. 10</li>
</ul>

## 二、计算题

计算：

$$
\int_0^1 x^2 \, dx
$$

<div class="answer-area">
  <!-- 答题区 -->
</div>
`);

console.log('PDF URL:', pdfUrl);
```

### cURL 示例

```bash
# 导出 PDF
curl -X POST http://localhost:3000/api/v1/pdf/export \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# Hello World\n\nThis is a test document.",
    "template": "github",
    "export_id": "your-export-uuid",
    "options": {
      "format": "A4"
    }
  }'

# 健康检查
curl http://localhost:3000/api/v1/health

# 获取模板列表
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/pdf/templates
```

---

## 工作流程

```
┌─────────────────┐
│   客户端应用     │
└────────┬────────┘
         │ 1. 创建导出记录 (pdf_export 表)
         ▼
┌─────────────────┐
│    Supabase     │
└────────┬────────┘
         │ 2. 调用 /api/v1/pdf/export
         ▼
┌─────────────────┐
│    DocSVR       │
│                 │
│ 3. 解析 Markdown│
│ 4. 套用模板     │
│ 5. 生成 HTML    │
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
│    DocSVR       │
│                 │
│ 9. 上传 Storage │
│ 10. 更新状态    │
└────────┬────────┘
         │ 11. 返回结果
         ▼
┌─────────────────┐
│   客户端应用     │
└─────────────────┘
```

---

## 注意事项

1. **认证**：所有 PDF 相关接口需要有效的 Supabase JWT 令牌
2. **export_id**：必须预先在 `pdf_export` 表中创建记录
3. **文件大小**：Markdown 内容建议不超过 1MB
4. **超时**：PDF 生成默认超时 60 秒
5. **并发**：Gotenberg 单实例并发约 5-10，建议生产环境多实例部署
