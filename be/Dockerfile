FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl ca-certificates
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS prisma-build
WORKDIR /app
RUN apk add --no-cache openssl ca-certificates
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json nest-cli.json tsconfig.json tsconfig.build.json prisma.config.ts ./
COPY prisma ./prisma
RUN npx prisma generate

FROM prisma-build AS build
COPY src ./src
# Prisma client outputs to prisma/client for this app
RUN npx nest build

FROM deps AS prod-deps
RUN npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV LOG_FILE_ENABLED=false
RUN apk add --no-cache openssl ca-certificates \
  && addgroup -S -g 1001 nestjs \
  && adduser -S -u 1001 -G nestjs nestjs
COPY --chown=nestjs:nestjs package.json package-lock.json prisma.config.ts ./
COPY --chown=nestjs:nestjs --from=prod-deps /app/node_modules ./node_modules
COPY --chown=nestjs:nestjs --from=prisma-build /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --chown=nestjs:nestjs --from=prisma-build /app/prisma/migrations ./prisma/migrations
COPY --chown=nestjs:nestjs docker/entrypoint.sh /app/docker/entrypoint.sh
RUN chmod +x /app/docker/entrypoint.sh
COPY --chown=nestjs:nestjs --from=build /app/dist ./dist
USER nestjs
EXPOSE 3000
ENTRYPOINT ["/app/docker/entrypoint.sh"]
