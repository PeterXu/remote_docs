# DocSVR 配置文档

## 环境变量

DocSVR 通过环境变量进行配置。以下是所有必需和可选的环境变量：

### 必需环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `SUPABASE_URL` | Supabase 项目 URL | `https://xxxxx.supabase.co` |
| `SUPABASE_JWT_SECRET` | Supabase JWT 密钥（用于验证用户令牌） | `your-jwt-secret` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role 密钥（用于 Storage 和数据库操作） | `your-service-role-key` |

### 可选环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `GOTENBERG_URL` | Gotenberg 服务地址 | `http://localhost:3001` |
| `PORT` | 服务监听端口 | `3000` |
| `NODE_ENV` | 运行环境 | `development` |

## Supabase 配置

### 1. 创建 Storage Bucket

在 Supabase 控制台创建名为 `pdf-exports` 的 Storage Bucket：

```sql
-- 在 Supabase SQL Editor 中执行
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdf-exports', 'pdf-exports', false);
```

### 2. 设置 Storage 策略

```sql
-- 允许用户上传自己的 PDF
CREATE POLICY "Users can upload own PDFs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pdf-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 允许用户读取自己的 PDF
CREATE POLICY "Users can read own PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'pdf-exports' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 3. 创建数据库表

```sql
CREATE TABLE pdf_export (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  storage_path TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_pdf_export_user_id ON pdf_export(user_id);
CREATE INDEX idx_pdf_export_status ON pdf_export(status);
```

### 4. 获取凭证

在 Supabase 控制台的 **Settings > API** 页面获取：

- **Project URL** → `SUPABASE_URL`
- **anon public key** → 用于客户端
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

在 **Settings > API > JWT Secret** 获取 `SUPABASE_JWT_SECRET`。

## 本地开发配置

### 1. 创建环境变量文件

```bash
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOTENBERG_URL=http://localhost:3001
PORT=3000
```

### 2. 启动 Gotenberg

```bash
docker run -p 3001:3000 gotenberg/gotenberg:8
```

### 3. 启动 DocSVR

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 或构建后运行
npm run build
npm start
```

## Docker 部署配置

### 使用 docker-compose（推荐）

```bash
# 创建 .env 文件后
docker-compose up -d
```

服务将启动：
- DocSVR: `http://localhost:3000`
- Gotenberg: `http://localhost:3001`

### 单独构建镜像

```bash
# 构建镜像
docker build -t docsvr .

# 运行容器
docker run -p 3000:3000 \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_JWT_SECRET=your-jwt-secret \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  -e GOTENBERG_URL=http://gotenberg:3000 \
  docsvr
```

## 生产环境建议

### 1. Gotenberg 扩展

Gotenberg 单实例并发约 5-10，生产环境建议多实例：

```yaml
# docker-compose.prod.yml
services:
  gotenberg:
    image: gotenberg/gotenberg:8
    deploy:
      replicas: 3
```

### 2. 任务队列

高并发场景建议引入任务队列（如 BullMQ）异步处理 PDF 生成。

### 3. 负载均衡

在 DocSVR 前配置负载均衡器（如 Nginx、Traefik）。

### 4. 监控

配置健康检查端点监控：

```bash
curl http://localhost:3000/api/v1/health
```

响应示例：
```json
{
  "status": "healthy",
  "services": {
    "gotenberg": "ok",
    "supabase": "ok"
  }
}
```
