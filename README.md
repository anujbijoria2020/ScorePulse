# SportBroadcast

Real-time sports match API with live commentary streaming over WebSockets.

## Tech Stack

- Node.js (ES modules)
- Express 5
- PostgreSQL
- Drizzle ORM + Drizzle Kit
- WebSocket (`ws`)
- Arcjet (HTTP + WebSocket protection)
- APM Insight agent (`apminsight`)

## Features

- Create and list matches
- Automatic match status selection (`scheduled`, `live`, `finished`) from start/end time
- Create and list commentary entries per match
- Real-time broadcast for:
  - new matches (`matchCreated`)
  - commentary updates for subscribed matches (`commentary`)
- Request validation with Zod
- Rate limiting and bot protection with Arcjet
- Seed script for generating large commentary datasets

## Project Structure

```text
src/
  index.js                 # App bootstrap (HTTP + WS)
  config/arcjet.js         # Arcjet setup for HTTP and WS
  db/
    db.js                  # PostgreSQL pool + Drizzle client
    schema.js              # Drizzle schema (matches, commentary)
  routes/
    matches.js             # /api/matches endpoints
    commentary.js          # /api/matches/:id/commentary endpoints
  validation/
    matches.js             # Match request/query schemas
    commentary.js          # Commentary request/query schemas
  utils/match-status.js    # Match status helper
  ws/server.js             # WebSocket server and subscriptions
seed/
  seed.js                  # Commentary seeding script
data/
  data.json                # Seed source data
drizzle/
  0000_cloudy_luminals.sql # Initial migration
```

## Prerequisites

- Node.js 18+
- PostgreSQL database

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
PORT=8000
HOST=0.0.0.0
ARCJET_KEY=your_arcjet_key
ARCJET_ENV=DRY_RUN
API_URL=
```

Notes:

- `DATABASE_URL` and `ARCJET_KEY` are required by the current code.
- `ARCJET_ENV` supports `DRY_RUN` or any other value (treated as `LIVE`).
- `API_URL` exists in `.env` but is not used in the current source.

## Install

```bash
npm install
```

## Database Setup

Generate migrations (optional if already generated):

```bash
npm run db:generate
```

Apply migrations:

```bash
npm run db:migrate
```

Open Drizzle Studio:

```bash
npm run db:studio
```

## Run

Development mode (watch):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Default base URL: `http://localhost:8000`

## Seed Commentary Data

The seed script posts commentary events to the running API.

1. Start the server.
2. Ensure match IDs in target range exist.
3. Run:

```bash
npm run seed
```

Optional seeding env vars:

- `SEED_BASE_URL` (default: `http://localhost:8000`)
- `SEED_COMMENTARY_COUNT` (default: `500`)
- `SEED_MATCH_ID_START` (default: `1`)
- `SEED_MATCH_ID_END` (default: `10`)

Example:

```bash
SEED_COMMENTARY_COUNT=1000 SEED_MATCH_ID_START=1 SEED_MATCH_ID_END=20 npm run seed
```

## REST API

### Health

- `GET /`

Response: plain text `hello from express server`

### Matches

- `GET /api/matches?limit=50`
- `POST /api/matches`

Create match payload:

```json
{
  "sport": "cricket",
  "homeTeam": "Mumbai Mavericks",
  "awayTeam": "Delhi Dynamos",
  "startTime": "2026-03-09T12:00:00Z",
  "endTime": "2026-03-09T15:00:00Z",
  "homeScore": 0,
  "awayScore": 0
}
```

### Commentary

- `GET /api/matches/:id/commentary?limit=100`
- `POST /api/matches/:id/commentary`

Create commentary payload:

```json
{
  "minute": 12,
  "sequence": 101,
  "period": "Innings 1",
  "eventType": "four",
  "actor": "A. Sharma",
  "team": "Mumbai Mavericks",
  "message": "Lofted over mid-on, that races away for FOUR.",
  "metadata": {
    "ballLabel": "12.3",
    "venue": "Wankhede Stadium"
  },
  "tags": ["four", "t20"]
}
```

## WebSocket

Endpoint:

- `ws://localhost:8000/ws`

### Incoming messages

Subscribe to match commentary:

```json
{ "type": "subscribe", "matchId": 1 }
```

Unsubscribe:

```json
{ "type": "unsubscribe", "matchId": 1 }
```

### Outgoing messages

- Welcome:

```json
{ "type": "welcome", "message": "Welcome to the Sports Match API WebSocket!" }
```

- Subscribe ack:

```json
{ "type": "subscribed", "matchId": 1 }
```

- New match broadcast (all clients):

```json
{ "type": "matchCreated", "data": { "id": 1, "...": "..." } }
```

- Commentary broadcast (subscribers of that match):

```json
{ "type": "commentary", "data": { "id": 10, "matchId": 1, "...": "..." } }
```

## NPM Scripts

- `npm run dev` - start with file watch
- `npm start` - start server
- `npm run seed` - seed commentary by calling API
- `npm run db:generate` - generate Drizzle migrations
- `npm run db:migrate` - apply migrations
- `npm run db:studio` - open Drizzle Studio
- `npm run db:demo` - runs `src/crud.js` (file is currently missing)

## Known Notes

- `npm run test` is a placeholder and exits with error.
- `db:demo` points to `src/crud.js`, which does not exist in this repository currently.
- Arcjet key is mandatory in current implementation; server startup fails without `ARCJET_KEY`.
