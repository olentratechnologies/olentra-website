FROM oven/bun:1

WORKDIR /app
# AI resume review: poppler reads PDFs (and renders scans), antiword reads .doc files.
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils antiword && rm -rf /var/lib/apt/lists/*
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY src ./src
COPY scripts ./scripts
COPY tsconfig.json ./tsconfig.json
RUN mkdir -p /app/.data && chown -R bun:bun /app

USER bun
ENV NODE_ENV=production
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["bun", "scripts/healthcheck.ts"]
CMD ["bun", "src/index.ts"]
