# remote_docs

Gotenberg PDF 生成服务的轻量级封装，支持多文档合并导出。

## 特性

- 多 Markdown 文档合并为单个 PDF
- 自动分页处理
- LaTeX 数学公式支持（KaTeX）
- 多种 PDF 模板（基础、GitHub 风格、试卷）
- Supabase JWT 认证
- Docker 部署支持

## 架构

```
[ Client ]
    ↓ POST /api/v1/pdf/export (JWT + documents)
[ remote_docs ]
    ├─ JWT 验证
    ├─ Markdown → HTML
    └─ 合并文档 + 分页
    ↓
[ Gotenberg ]
    ↓ PDF binary
[ Client 接收 PDF ]
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件
```

### 3. 启动 Gotenberg

```bash
docker run -d --name gotenberg -p 3001:3000 gotenberg/gotenberg:8
```

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## Docker 部署

```bash
# 使用 docker-compose（推荐）
docker-compose up -d

# 或单独构建
docker build -t remote_docs .
docker run -p 3000:3000 \
  -e SUPABASE_JWT_SECRET=your-secret \
  -e GOTENBERG_URL=http://gotenberg:3000 \
  remote_docs
```

## 文档

- [部署文档](docs/deployment.md) - 环境变量、Docker 配置
- [使用文档](docs/usage.md) - API 接口、示例代码

## API 端点

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/v1/health` | 健康检查 | 否 |
| GET | `/api/v1/pdf/templates` | 获取模板列表 | 是 |
| POST | `/api/v1/pdf/export` | 导出 PDF | 是 |

## 技术栈

- [Hono](https://hono.dev/) - Web 框架
- [markdown-it](https://github.com/markdown-it/markdown-it) - Markdown 解析
- [Gotenberg](https://gotenberg.dev/) - PDF 渲染引擎
- [Supabase](https://supabase.com/) - JWT 认证

## License

ISC
