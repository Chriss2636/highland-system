Highland System — Local Development

This document explains how to run the full stack locally (API + frontend) on your machine.

Prerequisites
- Node.js (v18+ recommended)
- npm (bundled with Node)

Server (API)
1. Open a terminal and go to the server folder:

   cd server

2. Install dependencies:

   npm install

3. Generate Prisma client and apply migrations (creates SQLite DB):

   npx prisma generate
   npx prisma migrate deploy

   If `migrate deploy` fails for any reason, as a fallback you can run:

   npx prisma db push

4. (Optional) Create the default admin user:

   node createAdmin.js

   This will upsert an admin user (email: admin@highland.com, password: Careen04).

5. Start the server (dev mode with auto-reload):

   npm run dev

   The API will listen on port 5000 by default (or the `PORT` env var).
   See [server/index.js](server/index.js#L1308) for the listen logic.

Client (Frontend)
1. Open another terminal and go to the client folder:

   cd client

2. Install dependencies:

   npm install

3. Start the Vite dev server:

   npm run dev

   Vite will start and typically serve on http://localhost:5173. The frontend is configured to talk to the API at http://localhost:5000 (see `client/src/api/hooks.ts`).

Notes & Troubleshooting
- If you change environment details, the server reads `PORT` and Prisma can use `DATABASE_URL` if you set it in a `.env` file inside `server/`.
- If `npx prisma migrate deploy` reports no migrations to run (or you just want to sync schema), `npx prisma db push` is an acceptable shortcut for local development.
- If you see CORS issues make sure the client is calling `http://localhost:5000` and the server process is running.

Useful files
- Server entry: [server/index.js](server/index.js#L1)
- Create admin script: [server/createAdmin.js](server/createAdmin.js#L1)
- Prisma schema & migrations: [server/prisma/schema.prisma](server/prisma/schema.prisma#L1)
- Frontend API base: [client/src/api/hooks.ts](client/src/api/hooks.ts#L1)

Want a single command to run both? I can add a root `package.json` and a `dev` script that runs both servers concurrently (Windows-friendly). Shall I add that for you?