FROM mcr.microsoft.com/playwright:v1.61.1-jammy

# Install Bun
RUN apt-get update \
  && apt-get install -y curl unzip \
  && curl -fsSL https://bun.sh/install | bash \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.bun/bin:${PATH}"
ENV NODE_ENV=production
ENV PORT=3000
ENV OUTPUT_DIR=/app/output
ENV BROWSER_ENGINE=playwright

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --production

COPY . .

VOLUME ["/app/output"]
EXPOSE 3000

CMD ["bun", "src/index.ts"]
