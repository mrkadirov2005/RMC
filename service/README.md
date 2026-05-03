# CRM Backend

Express.js + TypeScript backend for CRM application with PostgreSQL and pgAdmin.

## Installation

```bash
cd service
npm install
```

### Troubleshooting

- `Error: Cannot find module 'reflect-metadata'`: dependencies were installed in the wrong folder or are out of date. Run `npm install` from `service/` (not the repo root), then restart `npm run dev`.

## Database Setup (No Docker)

Install PostgreSQL locally and ensure you have a user/password that can connect.

Backend startup will:
- Create the database if it does not exist
- Run all migrations from `db/migrations/` automatically

Environment variables (read from `service/.env`):
- `DB_HOST` (default: `127.0.0.1`)
- `DB_PORT` (default: `5432`)
- `DB_USER` / `DB_PASSWORD` (used for normal DB access)
- `DB_NAME` (database to create/use)

Optional admin override (useful when `DB_USER` is not allowed to create databases):
- `DB_ADMIN_USER`, `DB_ADMIN_PASSWORD`, `DB_ADMIN_DB` (default admin DB: `postgres`)

Optional flags:
- `AUTO_CREATE_DB` (default: `true`)
- `AUTO_MIGRATE` (default: `true`)

## Request Logging (MongoDB)

Every HTTP request is logged into MongoDB collection `request_logs` with:
- `method`, `path`, `originalUrl`
- `ip`, `userAgent`, optional `deviceId` header (`x-device-id`)
- `userId`, `username`, `userType`, `role` (when authenticated)
- `statusCode`, `success`, `durationMs`, `aborted`

Environment variables:
- `MONGO_URI` (example: `mongodb://localhost:27017`)
- `MONGO_DB` (default: `crm_logs`)
- `REQUEST_LOG_TTL_DAYS` (0 = keep forever)

### Migrations

You can also run migrations manually:

```bash
npm run db:migrate
```

## Development

Run the development server with auto-reload:

```bash
npm run dev
```

Server listens on `PORT` from `.env` (defaults to `4000` if unset).

## Production

Build and start:

```bash
npm run build
npm start
```

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user (body: { email, name })

## Project Structure

```
src/
  ├── index.ts          # Main server file
  ├── routes/           # API routes
  ├── controllers/      # Route controllers
  └── middleware/       # Custom middleware
```

## Environment Variables

- `PORT` - Server port (default: 4000)
- `NODE_ENV` - Environment (development/production)
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_USER` - PostgreSQL user
- `DB_PASSWORD` - PostgreSQL password
- `DB_NAME` - PostgreSQL database name

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build TypeScript
- `npm start` - Start production server


