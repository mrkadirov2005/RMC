FROM node:20-bookworm-slim AS deps
WORKDIR /app/service

COPY service/package.json service/package-lock.json ./
# `npm ci` can fail on some npm builds/environments; `npm install` is more tolerant
# while still respecting `package-lock.json`.
RUN npm install --no-audit --no-fund

WORKDIR /app/ui
COPY ui/package.json ui/package-lock.json ./
RUN npm install --no-audit --no-fund

FROM node:20-bookworm-slim AS build
WORKDIR /app/service

COPY --from=deps /app/service/node_modules ./node_modules
# Copy only what we need to build to avoid accidentally carrying host-built `dist/`.
COPY service/package.json service/package-lock.json service/tsconfig.json ./
COPY service/src ./src
COPY service/.sequelizerc ./.sequelizerc
COPY service/config ./config
COPY service/db ./db
# Ensure stale `dist/` from the repo can't leak into the image layer.
# Also fail the build if a stale `dist/db/pool.js` still references `config/dbcon`.
RUN rm -rf dist && npm run build && ! grep -q "config/dbcon" dist/db/pool.js

FROM node:20-bookworm-slim AS runner
WORKDIR /app/service
ENV NODE_ENV=production

COPY --from=build /app/service/package.json /app/service/package-lock.json ./
COPY --from=build /app/service/node_modules ./node_modules
COPY --from=build /app/service/dist ./dist
COPY --from=build /app/service/.sequelizerc ./.sequelizerc
COPY --from=build /app/service/config ./config
COPY --from=build /app/service/db ./db

# The development-only E2E runner starts its own backend and Vite frontend, so
# both source trees and their development dependencies must exist in the image.
COPY service/src ./src
COPY service/tsconfig.json ./tsconfig.json
COPY --from=deps /app/ui/node_modules /app/ui/node_modules
COPY ui /app/ui

# Install Chromium and its Linux system libraries in the same container that
# executes Playwright. Vercel's dependencies are not available to this image.
WORKDIR /app/ui
RUN npx playwright install --with-deps chromium

WORKDIR /app/service

EXPOSE 4000
CMD ["sh", "-lc", "npm run db:migrate && node dist/index.js"]
