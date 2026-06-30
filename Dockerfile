FROM oven/bun:1.2-slim

# Install Lightpanda binary
RUN apt-get update \
  && apt-get install -y curl ca-certificates \
  && curl -L -o /usr/local/bin/lightpanda \
     https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-x86_64-linux \
  && chmod +x /usr/local/bin/lightpanda \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --production

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV OUTPUT_DIR=/app/output
ENV LIGHTPANDA_BIN=/usr/local/bin/lightpanda
ENV LIGHTPANDA_TELEMETRY=false

VOLUME ["/app/output"]
EXPOSE 3000

CMD ["bun", "src/index.ts"]
