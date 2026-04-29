FROM node:20-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
# `npm ci` can fail on some npm builds/environments; `npm install` is more tolerant
# while still respecting `package-lock.json`.
RUN npm install --no-audit --no-fund

FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
# Copy only what we need to build to avoid accidentally carrying host-built `dist/`.
COPY package.json package-lock.json tsconfig.json ./
COPY src ./src
COPY .sequelizerc ./.sequelizerc
COPY config ./config
COPY db ./db
# Ensure stale `dist/` from the repo can't leak into the image layer.
# Also fail the build if a stale `dist/db/pool.js` still references `config/dbcon`.
RUN rm -rf dist && npm run build && ! grep -q "config/dbcon" dist/db/pool.js

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/.sequelizerc ./.sequelizerc
COPY --from=build /app/config ./config
COPY --from=build /app/db ./db

EXPOSE 4000
CMD ["sh", "-lc", "npm run db:migrate && node dist/index.js"]
