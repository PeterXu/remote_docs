# DocSVR

Markdown 转 PDF 文档服务，支持 LaTeX 数学公式渲染。

## 特性

- Markdown 解析（GitHub Flavored Markdown）
- LaTeX 数学公式支持（KaTeX）
- 多种 PDF 模板（基础、GitHub 风格、试卷）
- Supabase 存储集成
- JWT 认证
- Docker 部署支持

## 架构

```
[ Supabase Edge Function ]
            ↓ (HTTP)
[ DocSVR (Node.js) ]
  - Markdown 解析（markdown-it）
  - 数学公式渲染（KaTeX）
  - 套用 PDF 模板
            ↓ (HTTP)
[ Gotenberg ]
            ↓
          PDF
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入 Supabase 凭证
```

### 3. 启动 Gotenberg

```bash
docker run -p 3001:3000 gotenberg/gotenberg:8
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
docker-compose up -d
```

## 文档

- [配置文档](docs/configuration.md) - 环境变量、Supabase 配置、Docker 部署
- [使用文档](docs/usage.md) - API 接口、Markdown 语法、示例代码

## API 端点

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/v1/health` | 健康检查 | 否 |
| GET | `/api/v1/pdf/templates` | 获取模板列表 | 是 |
| POST | `/api/v1/pdf/export` | 导出 PDF | 是 |

## 技术栈

- [Hono](https://hono.dev/) - Web 框架
- [markdown-it](https://github.com/markdown-it/markdown-it) - Markdown 解析
- [Gotenberg](https://gotenberg.dev/) - PDF 渲染
- [Supabase](https://supabase.com/) - 认证与存储

## License

ISC
