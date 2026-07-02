# 部署指南

## 单服务器 Docker Compose 部署（推荐）

### 前置条件

- Linux 服务器（Ubuntu 22.04+ 推荐）
- Docker + Docker Compose
- 出口公网 IP（如果要对外暴露 API）
- 可选：域名 + SSL 证书（Nginx / Caddy）

### 步骤

#### 1. 准备服务器目录

```bash
mkdir -p /opt/request-design
cd /opt/request-design
git clone <repo-url> .
```

#### 2. 配置环境变量

```bash
cp .env.example .env
vim .env
```

填入：

```env
DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=sk-...
LLM_MODEL=deepseek-v4-flash
BROWSER_ENGINE=playwright
PORT=3000
```

#### 3. 推送数据库 schema

只需要做一次（或 schema 变更后）：

```bash
docker run --rm -v $PWD:/app -w /app --env-file .env \
  oven/bun:1.2 bunx drizzle-kit push
```

#### 4. 构建并启动

```bash
docker compose up -d --build
```

`docker-compose.yml` 会：

- 构建 `mcr.microsoft.com/playwright` + Bun 镜像
- 暴露 3000 端口
- 配置 healthcheck
- 自动重启（除非手动 stop）

查看日志：

```bash
docker compose logs -f request-design-api
```

#### 5. 验证

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

提交一个测试任务：

```bash
curl -X POST http://localhost:3000/analyze \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.deepseek.com/"}'
```

返回 `jobId`，轮询：

```bash
curl http://localhost:3000/jobs/<jobId>
```

下载：

```bash
curl http://localhost:3000/jobs/<jobId>/download > DESIGN.md
```

### 反向代理（Nginx + Let's Encrypt）

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

申请证书：

```bash
certbot --nginx -d api.yourdomain.com
```

### 监控

简单方案：用 [UptimeRobot](https://uptimerobot.com) 或 [Healthchecks.io](https://healthchecks.io) 监控 `https://api.yourdomain.com/health`。

进阶方案：导出 Prometheus metrics（建议作为 v2 feature，本版本暂不实现）。

### 升级

```bash
cd /opt/request-design
git pull
docker compose build --no-cache
docker compose up -d
```

### 清理

容器是无状态的，所有结果在 Supabase。要清理：

```bash
docker compose down
rm -rf /opt/request-design
```

Supabase 数据库可以单独保留或重置。

## 系统要求

| 资源 | 最低 | 推荐 |
|---|---|---|
| CPU | 2 核 | 4 核（Playwright Chromium 较吃 CPU） |
| RAM | 4 GB | 8 GB |
| 磁盘 | 5 GB | 10 GB |
| 出口带宽 | 10 Mbps | 50 Mbps |
| 操作系统 | Linux x64 / arm64 | Ubuntu 22.04 LTS |

## 多 worker（流量大时）

单容器适合每天 < 100 次分析。如果流量更大，加 Redis BullMQ + 多个 worker container。

修改 `src/services/analyzer.ts` 的 `startAnalysis()` 调度部分即可——目前是 fire-and-forget，加队列只需要加一层 dispatch。

## 故障排查

| 症状 | 排查 |
|---|---|
| `health` 返回 502 | 容器崩溃，`docker compose logs request-design-api` |
| LLM 调用超时 | 检查 `LLM_BASE_URL` / `LLM_API_KEY` |
| Playwright 失败 | 镜像基于 `mcr.microsoft.com/playwright`，已带 Chromium，无需额外安装 |
| Supabase 连接失败 | 检查 `DATABASE_URL`，确认 IPv4 pooler URL |
| Job 一直 `running` | 浏览器抓取卡住——大多数目标网站需要 ≤ 15s，否则 timeout |
| Job 直接 `failed` | `docker compose logs request-design-api \| grep error` |