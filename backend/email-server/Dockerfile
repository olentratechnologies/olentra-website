FROM oven/bun:1

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY src ./src
COPY scripts ./scripts
COPY tsconfig.json ./tsconfig.json
RUN chown -R bun:bun /app

USER bun
ENV NODE_ENV=production
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["bun", "scripts/healthcheck.ts"]
CMD ["bun", "src/index.ts"]
