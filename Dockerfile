FROM node:20-slim

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制构建产物
COPY dist ./dist

# 环境变量
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/index.js"]
