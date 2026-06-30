# request-design-runtime

单体 Docker 化的 API 服务：输入网站 URL，使用 Lightpanda 无头浏览器爬取并提取设计 token，生成符合 Stitch Design.md 格式的 `DESIGN.md`。

## 技术栈

- **Bun + TypeScript + Hono**
- **Lightpanda**（MCP stdio 接口）
- **Supabase Postgres + Drizzle ORM**
- **OpenAI 兼容 LLM API**（默认 DeepSeek）

## 快速开始

```bash
# 1. 安装依赖
bun install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 Supabase 密码、DeepSeek API key 等

# 3. 启动测试数据库
docker compose -f docker-compose.test.yml up -d

# 4. 推送数据库 schema
bunx drizzle-kit push

# 5. 运行测试
bun test
bun test --coverage

# 6. 启动服务
bun run dev
```

## API

- `POST /analyze` — 提交 URL，返回 jobId
- `GET /jobs/:id` — 查询 Job 状态
- `GET /jobs/:id/download` — 下载生成的 DESIGN.md
- `GET /health` — 健康检查

## Docker

```bash
docker compose up --build
```

## 测试

严格遵循 TDD：

- 86 个测试用例全部通过
- 行覆盖率 **97.79%**，函数覆盖率 **98.32%**

```bash
bun test --coverage
```

## 项目结构

```
src/
  routes/        # Hono 路由
  services/      # 业务逻辑（MCP、爬取、提取、合成、LLM、DESIGN.md 生成）
  utils/         # URL、颜色、token 工具函数
drizzle/         # Drizzle schema 与迁移
tests/           # 单元、集成、端到端测试
```
