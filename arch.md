# remote_docs 架构设计

## 概述

remote_docs 是 Gotenberg PDF 服务的轻量级封装，专注于将多个 Markdown 文档合并为单个 PDF。

## 架构图

```
[ Client / Web UI ]
        ↓ POST /api/v1/pdf/export
        Authorization: Bearer <supabase_jwt>
        {
          config: { caption, copyright, author, ... },
          documents: [
            { chapter: "..." } | { title: "...", items: ["...", "..."] }
          ],
          template: "github"
        }
[ remote_docs (Hono/Node.js) ]
        ├─ JWT 验证
        ├─ 解析请求结构
        ├─ 处理 config（标题、版权、作者等）
        ├─ 处理 chapter（章节标题，分页控制）
        ├─ 解析 items 中的每个 markdown 为 HTML
        ├─ 合并 HTML + 添加分页样式
        └─ 转发到 Gotenberg
        ↓
[ Gotenberg ]
        ↓ PDF 二进制
[ Client 接收 PDF 流 ]
```

## 核心技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 运行时 | Node.js 20 | 服务端运行环境 |
| Web框架 | Hono | 轻量、高性能 |
| PDF渲染 | Gotenberg 8 | 基于 Chromium |
| Markdown | markdown-it | 解析 Markdown |
| 数学公式 | KaTeX | LaTeX 公式支持 |
| 认证 | Supabase JWT | 用户身份验证 |

## 设计原则

1. **轻量封装** - 仅做 Markdown 转换和认证，核心 PDF 生成交给 Gotenberg
2. **无状态** - 不依赖数据库，不存储文件，易于水平扩展
3. **直接响应** - PDF 直接返回给客户端，无中间存储

## 请求流程

```
1. 客户端发送 POST /api/v1/pdf/export
   - JWT Token (Supabase)
   - config 对象（可选）：caption, copyright, author, date 等
   - documents 数组（必需）：
     - { chapter: "章节名" } - 章节标题（可选）
     - { title: "标题", items: ["md1", "md2"] } - 内容项
   - template 选项（可选，默认 base）
   - options（可选）：format, margin, showPageNumber, watermark, cssVars 等

2. remote_docs 处理
   - 验证 JWT
   - 验证请求参数
   - 生成 config 头部 HTML（如果有）
   - 处理每个 document item：
     - chapter → 大标题（第一个与 config 同页，其余新页）
     - content → 拼接所有 items 的 HTML
   - 合并 HTML，添加分页样式
   - 添加页眉页脚（支持页码）

3. 调用 Gotenberg
   - 发送 multipart/form-data
   - 包含完整 HTML

4. 返回 PDF
   - Gotenberg 返回 PDF 二进制
   - remote_docs 直接流式返回给客户端
```

## 项目结构

```
remote_docs/
├── src/
│   ├── index.ts              # 入口，Hono 应用
│   ├── routes/
│   │   ├── pdf.ts            # PDF 导出 API
│   │   ├── health.ts         # 健康检查
│   │   └── ui.ts             # Web 管理界面
│   ├── services/
│   │   ├── gotenberg.ts      # Gotenberg 客户端
│   │   └── markdown.ts       # Markdown 解析
│   ├── templates/
│   │   ├── base.ts           # 基础样式
│   │   ├── github.ts         # GitHub 风格
│   │   ├── exam.ts           # 试卷模板
│   │   └── index.ts          # 模板注册
│   ├── middleware/
│   │   └── auth.ts           # JWT 验证
│   └── types/
│       └── index.ts          # 类型定义
├── docs/
│   ├── usage.md              # 使用文档
│   └── configuration.md      # 配置文档
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 分页策略

支持多种分页控制（所有功能均为可选）：

1. **config 部分**（可选）：显示在首页顶部
2. **chapter 章节**（可选）：
   - 有 config 时：第一个 chapter 与 config 同页
   - 无 config 时：第一个 chapter 在首页
   - 后续 chapter 强制开始新页面 (`page-break-before: always`)
3. **content 内容**：跟随前面的内容
4. **无 chapter 时**：所有 content 项按顺序连续排列

CSS 实现：

```css
.page-break-before {
  page-break-before: always;
  break-before: page;
}
```

## 安全措施

1. **JWT 验证** - 所有 PDF 接口需要有效的 Supabase JWT
2. **禁用原始 HTML** - markdown-it 配置 `html: false`
3. **输入验证** - 限制文档数量 (50) 和大小 (10MB)
4. **请求大小限制** - 请求体不超过 15MB
5. **错误信息脱敏** - 不暴露内部错误细节

## 扩展建议

### 高并发场景

```yaml
# docker-compose.prod.yml
services:
  gotenberg:
    deploy:
      replicas: 3
```

### 添加更多模板

在 `src/templates/` 添加新模板文件，然后在 `index.ts` 注册。

### 添加新功能

remote_docs 设计为轻量封装，复杂功能建议：
- 直接使用 Gotenberg API
- 或在 Supabase Edge Function 中处理
