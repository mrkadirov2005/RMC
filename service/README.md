# CRM Backend

Express.js + TypeScript backend for CRM application with PostgreSQL and pgAdmin.

## Installation

```bash
cd service
npm install
```

### Troubleshooting

- `Error: Cannot find module 'reflect-metadata'`: dependencies were installed in the wrong folder or are out of date. Run `npm install` from `service/` (not the repo root), then restart `npm run dev`.

## Database Setup

### Using Docker Compose (Recommended)

From `service/`, start the databases with:

```bash
docker compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- MongoDB on `localhost:27017` (used for request logging)
- Backend API on `localhost:3000`

The database initializes automatically from the SQL schema files on first run.

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

### Create Tables

Connect to the database using pgAdmin and run the following SQL:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Development

Run the development server with auto-reload:

```bash
npm run dev
```

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

- `PORT` - Server port (default: 3000)
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


