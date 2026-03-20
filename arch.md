# remote_docs 架构设计

## 概述

remote_docs 是 Gotenberg PDF 服务的轻量级封装，专注于将多个 Markdown 文档合并为单个 PDF。

## 架构图

```
[ Client / Web UI ]
        ↓ POST /api/v1/pdf/export
        Authorization: Bearer <supabase_jwt>
        { documents: [...], template: "github" }
[ remote_docs (Hono/Node.js) ]
        ├─ JWT 验证
        ├─ 解析每个 markdown 为 HTML
        ├─ 合并 HTML + 添加分页
        └─ 转发 multipart 请求
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
   - documents 数组 (多个 markdown)
   - template 选项

2. remote_docs 处理
   - 验证 JWT
   - 验证请求参数
   - 解析每个 markdown → HTML
   - 合并 HTML，添加分页样式

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

每个文档自动开始新的一页，使用 CSS 实现：

```css
.document-section {
  page-break-after: always;
}
.document-section:last-child {
  page-break-after: auto;
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
