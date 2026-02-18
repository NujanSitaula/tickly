# Tickly (frontend)

Next.js frontend for **Tickly** (tickly.one) — tasks and projects. Uses the Laravel API in `../backend` with Laravel Passport (Bearer token). Branded as Tickly.

## Setup

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`: set `NEXT_PUBLIC_API_URL` to your API base (e.g. `http://127.0.0.1:8000/api/v1`). Production: `https://api.tickly.one/api/v1`.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in or register; the app sends `Authorization: Bearer <token>` to the Tickly API.

## Environment

- `NEXT_PUBLIC_API_URL` — API base URL (e.g. `http://127.0.0.1:8000/api/v1`)
- `NEXT_PUBLIC_APP_NAME` — Tickly
- `NEXT_PUBLIC_APP_DOMAIN` — tickly.one (optional, for links)

## Features

- Login / register (Passport Bearer token stored in localStorage)
- Projects list and create
- Tasks list, create, toggle complete (by project)
- Protected routes (redirect to login when not authenticated)

Start the backend (`php artisan serve` in `backend/`) before using the frontend.
