# request-design API 服务设计文档

**状态**：待实现  
**日期**：2026-06-30  
**作者**：Claude + wangxiaonan  

## 1. 目标

提供一个单体 Docker 化的 HTTP API 服务，输入任意网站 URL，自动：

1. 爬取最多 6 个相关页面；
2. 提取设计 token（颜色、字体、间距、圆角、阴影等）；
3. 按 [Stitch Design.md](https://stitch.withgoogle.com/docs/design-md/overview) 格式生成 `DESIGN.md`；
4. 持久化 Job 状态，支持异步轮询结果。

本服务基于 [`request-design-skill`](https://github.com/dawnswwwww/request-design-skill) 的算法逻辑实现，并使用 [Lightpanda](https://lightpanda.io) 作为无头浏览器引擎。

## 2. 关键约束

| 项 | 选择 | 原因 |
|---|---|---|
| 运行时 | Bun + TypeScript | 快速启动、内置 `fetch`/测试、适合 I/O 密集型 API |
| HTTP 框架 | Hono | 轻量、Bun 原生支持好、中间件生态成熟 |
| 浏览器 | Lightpanda MCP stdio | 无 Puppeteer/Playwright 依赖，直接通过 MCP tool 驱动 |
| 数据库 | Supabase Postgres + Drizzle ORM | 用户已有连接，持久化 Job 状态 |
| LLM | OpenAI 兼容接口 | 可配置 BASE_URL / API_KEY / MODEL，适配第三方或本地服务 |
| API 模式 | 异步 Job + 轮询 | 分析耗时 30-120s，避免长连接超时 |

## 3. 总体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Container                       │
│  ┌──────────────┐      ┌──────────────────────────────┐    │
│  │   Bun API    │◄────►│   Lightpanda MCP (stdio)     │    │
│  │   (Hono)     │ JSON-RPC│   goto / evaluate / links  │    │
│  └──────┬───────┘      └──────────────────────────────┘    │
│         │                                                   │
│  ┌──────▼───────┐      ┌──────────────────────────────┐    │
│  │  Drizzle ORM │      │   /output/*.md (volume)      │    │
│  │  Supabase PG │      │   DESIGN.md                  │    │
│  └──────────────┘      └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

说明：

- 一个 Job 独占一个 Lightpanda MCP 子进程，避免会话串扰。
- Supabase Postgres 在容器外部，通过 `DATABASE_URL` 连接。
- `DESIGN.md` 文件写入容器内 `/output` 目录，生产环境可挂载卷。

## 4. 数据模型

```ts
// drizzle/schema.ts
import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  url: text('url').notNull(),
  status: text('status').notNull().default('pending'),
  outputPath: text('output_path'),
  progress: integer('progress').notNull().default(0),
  extractedTokens: jsonb('extracted_tokens'),
  result: jsonb('result'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

`status` 取值：`pending | running | completed | failed`。

## 5. API 规范

### 5.1 POST /analyze

请求：

```json
{
  "url": "https://stripe.com",
  "outputPath": "stripe/DESIGN.md"
}
```

响应：

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000"
}
```

说明：`outputPath` 可选，默认 `{domain}/DESIGN.md`。

### 5.2 GET /jobs/:id

响应示例（运行中）：

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "url": "https://stripe.com",
  "status": "running",
  "progress": 45,
  "createdAt": "2026-06-30T12:00:00Z",
  "updatedAt": "2026-06-30T12:00:30Z"
}
```

响应示例（完成）：

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "url": "https://stripe.com",
  "status": "completed",
  "progress": 100,
  "result": {
    "pagesCrawled": 6,
    "outputPath": "stripe/DESIGN.md",
    "downloadUrl": "/jobs/550e8400-e29b-41d4-a716-446655440000/download"
  },
  "updatedAt": "2026-06-30T12:01:10Z"
}
```

### 5.3 GET /jobs/:id/download

返回 `DESIGN.md` 文件内容，`Content-Type: text/markdown`。

### 5.4 GET /health

返回服务及 Lightpanda 进程健康状态。

## 6. 组件设计

| 组件 | 文件（示意） | 职责 |
|---|---|---|
| `server` | `src/index.ts` | 启动 Hono，注册路由 |
| `routes/jobs` | `src/routes/jobs.ts` | `/analyze`、`/jobs/:id`、`/download` 路由 |
| `services/jobService` | `src/services/job.ts` | 创建/更新/查询 Job |
| `services/crawler` | `src/services/crawler.ts` | 实现 skill 的爬取、分类、提取逻辑 |
| `services/mcpClient` | `src/services/mcp.ts` | 封装 Lightpanda MCP stdio JSON-RPC |
| `services/extractor` | `src/services/extractor.ts` | DOM 计算样式提取与 token 归一化 |
| `services/synthesizer` | `src/services/synthesizer.ts` | 颜色去重、LAB 分组、token 命名 |
| `services/designMdGenerator` | `src/services/design-md.ts` | 组装 YAML front matter，调用 LLM 写 Markdown |
| `services/llm` | `src/services/llm.ts` | OpenAI 兼容客户端 |
| `db/schema` | `drizzle/schema.ts` | Drizzle 表定义 |
| `db/client` | `src/db.ts` | Drizzle 客户端初始化 |

## 7. 核心流程

### 7.1 Job 创建

1. 校验 `url`。
2. 生成 `outputPath`（若未提供）。
3. 在 Supabase 插入 `jobs` 记录，`status = pending`。
4. 返回 `jobId`。
5. 后台 worker 异步消费该 Job。

### 7.2 爬取阶段（复现 skill Phase 1）

1. 启动 Lightpanda MCP 子进程。
2. `goto` 根页 `/`。
3. 提取品牌名（`<meta property="og:site_name">`、`<title>`、header logo）。
4. 检测主题切换按钮（`interactiveElements` + class 启发式）。
5. `links` 获取内链，按 URL/锚文本分类（pricing、features、docs 等）。
6. 去重、排序，选择最多 6 页（根页 + 2 HIGH + 1 MEDIUM，不足则扩展）。
7. 对每页：
   - `goto` 页面；
   - 注入 JS（`evaluate`）收集所有可见元素的 `getComputedStyle`；
   - 记录颜色、字体、间距、圆角、阴影；
   - 如需要，切换视口（桌面/移动）重新加载。

### 7.3 合成阶段（复现 skill Phase 2）

1. 颜色去重：大小写归一、LAB 空间 3% 容差分组。
2. 按角色命名：`primary`、`secondary`、`surface`、`on-surface`、`error`。
3. 构建间距阶梯（4/8/16/24/32/48/64）。
4. 构建圆角阶梯（none/sm/md/lg/xl/full）。
5. 记录每个 token 的来源页面。

### 7.4 生成阶段（复现 skill Phase 3）

1. 把结构化 token 数据序列化为 JSON。
2. 构造 system prompt：
   - 说明 Stitch Design.md 格式；
   - 给出 YAML front matter 模板；
   - 要求 Markdown 正文按固定章节顺序；
   - 强调 token 是规范、正文是解释。
3. 调用 LLM，生成 Markdown 正文。
4. 合并 YAML front matter + Markdown body。
5. 写入 `/output/{outputPath}`。
6. 更新 Job 状态为 `completed`。

## 8. MCP 调用映射

| Skill 步骤 | MCP tool | 说明 |
|---|---|---|
| 导航 | `goto` | 加载根页/目标页 |
| 提取内链 | `links` | 返回同域链接及锚文本 |
| 获取页面结构 | `semantic_tree` | 辅助定位 header/nav/footer |
| 获取元数据 | `structuredData` | JSON-LD / OpenGraph |
| 执行提取脚本 | `evaluate` | 注入 JS 收集 computed styles |
| 检测交互元素 | `interactiveElements` | 找主题按钮、关闭按钮 |

### 8.1 evaluate 脚本示例

```js
(() => {
  const elements = document.querySelectorAll('body, body *');
  const samples = [];
  for (const el of elements) {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    samples.push({
      tag: el.tagName,
      class: el.className,
      color: style.color,
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      borderRadius: style.borderRadius,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      padding: style.padding,
      margin: style.margin,
      gap: style.gap,
      boxShadow: style.boxShadow,
    });
  }
  return samples.slice(0, 500);
})();
```

说明：采样策略需优化，避免返回过多；可按可见性、元素类型分层采样。

## 9. LLM 集成

使用 `openai` 包：

```ts
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY,
});
```

调用：

```ts
const completion = await openai.chat.completions.create({
  model: process.env.LLM_MODEL,
  messages: [
    { role: 'system', content: DESIGN_MD_SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(extractedTokens) },
  ],
  temperature: 0.3,
});
```

失败时重试 2 次；若仍失败，Job 标记 `failed` 并记录错误。

## 10. 配置项

```env
# Server
PORT=3000
OUTPUT_DIR=/output

# Supabase / Drizzle
DATABASE_URL="postgresql://postgres.aalebhetaflxbwmawsft:[YOUR-PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"

# LLM (OpenAI compatible)
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o

# Lightpanda
LIGHTPANDA_BIN=lightpanda
LIGHTPANDA_TELEMETRY=false

# Crawler
MAX_PAGES=6
PAGE_TIMEOUT_MS=30000
JOB_TIMEOUT_MS=300000
```

说明：Supabase 使用 transaction-mode pooler 时，需设置 `prepare: false`。

## 11. Docker 设计

```dockerfile
FROM oven/bun:1.2-slim

# Install Lightpanda binary
RUN apt-get update && apt-get install -y curl ca-certificates \
  && curl -L -o /usr/local/bin/lightpanda \
     https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-x86_64-linux \
  && chmod +x /usr/local/bin/lightpanda \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --production

COPY . .

ENV OUTPUT_DIR=/output
ENV LIGHTPANDA_BIN=/usr/local/bin/lightpanda
VOLUME ["/output"]

EXPOSE 3000
CMD ["bun", "src/index.ts"]
```

构建/运行：

```bash
docker build -t request-design-api .
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=... \
  -e LLM_API_KEY=... \
  -v $(pwd)/output:/output \
  request-design-api
```

## 12. 测试策略

1. **单元测试**：token 去重、颜色 LAB 分组、URL 分类函数。
2. **MCP Mock 测试**：用伪 Lightpanda 进程验证 JSON-RPC 客户端。
3. **集成测试**：启动本地静态 HTML 服务器，跑完整 `/analyze` 流程。
4. **数据库测试**：使用 Supabase 本地/测试项目或临时 schema。

## 13. 风险与缓解

| 风险 | 缓解 |
|---|---|
| Lightpanda 仍 beta，部分站点失败 | 返回明确错误；后续可加入 CDP raw WebSocket fallback |
| MCP `evaluate` 返回值/能力变化 | 封装 `McpClient`，统一处理异常和版本兼容 |
| LLM 输出不符合 YAML/Markdown 格式 | prompt 中给严格示例；解析失败重试 |
| 单 Lightpanda 进程阻塞队列 | Job 独占进程，失败时清理；后续可扩展进程池 |
| 第三方 LLM 超时 | 设置请求超时与 Job 总超时 |

## 14. 待实现清单

- [ ] 初始化 Bun + Hono + Drizzle 项目结构
- [ ] 配置 Supabase 连接与 `jobs` 表迁移
- [ ] 实现 Lightpanda MCP stdio 客户端
- [ ] 实现爬取、分类、提取、合成逻辑
- [ ] 实现 LLM DESIGN.md 生成
- [ ] 实现 `/analyze`、`/jobs/:id`、`/download`、`/health`
- [ ] Dockerfile 与 docker-compose（可选）
- [ ] 单元测试与集成测试

## 15. 后续可扩展

- 用户认证与速率限制
- WebHook / SSE 完成通知
- 结果上传到 S3/R2 替代本地文件
- 浏览器进程池化提升并发
- 截图/视觉对比（若 Lightpanda 后续支持渲染）
