# Scholaris production image
# Express serves both the API and the compiled React SPA from one origin.

FROM node:22-bookworm-slim AS build
WORKDIR /app

# Prisma needs OpenSSL at build time.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
RUN npm ci

COPY . .
RUN npm run db:generate && npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/prisma ./server/prisma
COPY --from=build /app/client/dist ./client/dist

# Non-root runtime user; the mounted data directory must be writable by it.
RUN useradd --system --create-home --uid 10001 scholaris \
  && mkdir -p /data \
  && chown -R scholaris:scholaris /app /data
USER scholaris

ENV HOST=0.0.0.0
ENV PORT=4000
ENV DATABASE_URL="file:/data/scholaris.db"
EXPOSE 4000

# Apply committed migrations, then start the API + SPA server.
CMD ["sh", "-c", "npm run db:deploy -w server && node server/dist/index.js"]
