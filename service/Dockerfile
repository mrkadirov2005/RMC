FROM node:20-bookworm-slim

ENV NODE_ENV=production

# Install and compile the backend in place. Keeping this as a single-stage
# image avoids copying the large service node_modules tree through multiple
# Docker layers, which is important on small EC2 root volumes.
WORKDIR /app/service
COPY service/package.json service/package-lock.json ./
RUN npm install --include=dev --no-audit --no-fund \
    && npm cache clean --force

COPY service/tsconfig.json service/.sequelizerc ./
COPY service/src ./src
COPY service/config ./config
COPY service/db ./db
RUN rm -rf dist \
    && npm run build \
    && ! grep -q "config/dbcon" dist/db/pool.js

# The public user-docs route (index.ts, mounted at /help) serves this folder
# via path.join(__dirname, '../../docs') — __dirname is /app/service/dist at
# runtime, so it resolves to /app/docs. Copied here, not under WORKDIR, to
# match that path exactly.
COPY docs /app/docs
RUN mkdir -p /backup-control

WORKDIR /app/service
EXPOSE 4000
CMD ["sh", "-lc", "npm run db:migrate && node dist/index.js"]
