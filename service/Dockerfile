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

# The E2E runner starts Vite and a test backend inside this container.
WORKDIR /app/ui
COPY ui/package.json ui/package-lock.json ./
RUN npm install --include=dev --no-audit --no-fund \
    && npm cache clean --force
COPY ui ./

# Install the browser and required Linux libraries in the execution image.
RUN npx playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/* /tmp/*

WORKDIR /app/service
EXPOSE 4000
CMD ["sh", "-lc", "npm run db:migrate && node dist/index.js"]
