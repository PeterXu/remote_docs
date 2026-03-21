# remote_docs 配置文档

## 环境变量

remote_docs 通过环境变量进行配置。

### 必需环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `SUPABASE_JWT_SECRET` | Supabase JWT 密钥（用于验证用户令牌） | `your-jwt-secret` |

### 可选环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务监听端口 | `3000` |
| `NODE_ENV` | 运行环境 | `development` |
| `GOTENBERG_TIMEOUT` | PDF 生成超时时间（毫秒） | `60000` |
| `GOTENBERG_URL` | Gotenberg 服务地址（仅本地开发） | `http://localhost:3001` |

> **注意**：`GOTENBERG_URL` 在 Docker Compose 环境中由 `docker-compose.yml` 固定为 `http://gotenberg:3000`，无需配置。

## 获取 Supabase JWT Secret

1. 登录 [Supabase Dashboard](https://app.supabase.com/)
2. 选择你的项目
3. 进入 **Settings > API**
4. 在 **JWT Secret** 部分找到密钥

## 本地开发配置

### 1. 创建环境变量文件

```bash
cp .env.example .env
# 编辑 .env，填入真实的 SUPABASE_JWT_SECRET
```

`.env` 文件内容：
```bash
# 必需
SUPABASE_JWT_SECRET=your-jwt-secret

# 可选（已有默认值）
PORT=3000
NODE_ENV=development
GOTENBERG_TIMEOUT=60000
```

### 2. 启动 Gotenberg

```bash
docker run -d --name gotenberg -p 3001:3000 gotenberg/gotenberg:8
```

### 3. 启动 remote_docs

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 或构建后运行
npm run build
npm start
```

### 4. 验证服务

```bash
# 健康检查
curl http://localhost:3000/api/v1/pdf/health
```

期望响应：
```json
{
  "status": "healthy",
  "services": {
    "gotenberg": "ok"
  }
}
```

## Docker 部署

### 使用 docker-compose（推荐）

```yaml
# docker-compose.yml
version: '3.8'

services:
  remote-docs-api:
    image: remote-docs-api
    build: .
    ports:
      - "${PORT:-3000}:${PORT:-3000}"
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - PORT=${PORT:-3000}
      - SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET}
      - GOTENBERG_URL=http://gotenberg:3000
      - GOTENBERG_TIMEOUT=${GOTENBERG_TIMEOUT:-60000}
    depends_on:
      - gotenberg
    restart: unless-stopped

  gotenberg:
    image: gotenberg/gotenberg:8
    restart: unless-stopped
```

**配置说明：**
- `${VAR:-default}` 表示优先使用 `.env` 中的值，不存在则使用默认值
- `GOTENBERG_URL` 固定为 `http://gotenberg:3000`（Docker 内部网络）
- 只有 `SUPABASE_JWT_SECRET` 是必需的，其他都有默认值

启动服务：

```bash
# 创建 .env 文件
cp .env.example .env
# 编辑 .env，填入真实的 SUPABASE_JWT_SECRET

# 启动
docker-compose up -d

# 查看日志
docker-compose logs -f remote-docs-api
```

### 单独构建镜像

```bash
# 构建镜像
docker build -t remote-docs-api .

# 运行容器（需要单独运行 Gotenberg）
docker run -p 3000:3000 \
  -e SUPABASE_JWT_SECRET=your-jwt-secret \
  -e GOTENBERG_URL=http://gotenberg-host:3000 \
  -e GOTENBERG_TIMEOUT=60000 \
  remote-docs-api
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
    environment:
      - CHROMIUM_START_INDEX=0
```

配合负载均衡器分发请求。

### 2. 启用 Gotenberg Basic Auth

Gotenberg 支持内置的 Basic Auth：

```yaml
services:
  gotenberg:
    image: gotenberg/gotenberg:8
    environment:
      - GOTENBERG_API_BASIC_AUTH_USERNAME=admin
      - GOTENBERG_API_BASIC_AUTH_PASSWORD=secure-password
```

然后在 remote_docs 中配置：

```bash
# 注意：需要修改代码支持 Basic Auth
GOTENBERG_URL=http://admin:secure-password@gotenberg:3000
```

### 3. 负载均衡

在 remote_docs 前配置负载均衡器（如 Nginx、Traefik）：

```nginx
# nginx.conf
upstream remote_docs_api {
    server remote-docs-api-1:3000;
    server remote-docs-api-2:3000;
    server remote-docs-api-3:3000;
}

server {
    listen 80;

    location / {
        proxy_pass http://remote_docs_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # 增加超时时间（PDF 生成可能较慢）
        proxy_read_timeout 120s;
    }
}
```

### 4. 监控

配置健康检查端点监控：

```bash
# Kubernetes liveness probe 示例
livenessProbe:
  httpGet:
    path: /api/v1/pdf/health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 30
```

### 5. 资源限制

```yaml
services:
  remote-docs-api:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  gotenberg:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 6. 日志配置

```bash
# 设置日志级别
NODE_ENV=production

# 配置日志输出（如果需要）
# LOG_LEVEL=info
```

## 部署检查清单

- [ ] 设置 `SUPABASE_JWT_SECRET` 环境变量
- [ ] Gotenberg 服务可达
- [ ] 健康检查返回正常
- [ ] 配置了适当的超时时间
- [ ] 设置了资源限制
- [ ] 配置了监控和告警
- [ ] 测试了 JWT 认证流程
- [ ] 测试了 PDF 生成功能

## 故障排查

### 服务无法启动

1. 检查 `SUPABASE_JWT_SECRET` 是否设置
2. 检查端口 3000 是否被占用
3. 查看日志：`docker-compose logs remote-docs-api`

### Gotenberg 连接失败

1. 检查 Gotenberg 容器是否运行：`docker ps`
2. 检查网络连通性：`curl http://gotenberg:3000/health`
3. 检查 `GOTENBERG_URL` 配置

### PDF 生成超时

1. 增加 `GOTENBERG_TIMEOUT` 值
2. 检查文档大小，可能需要拆分
3. 增加 Gotenberg 实例数量

### JWT 验证失败

1. 确认使用的是 Supabase 的 JWT Secret（不是 anon key）
2. 检查令牌是否过期
3. 确认 Authorization 头格式正确：`Bearer <token>`
