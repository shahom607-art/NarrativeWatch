# NarrativeWatch

Research and awareness dashboard for suspected coordinated inauthentic behavior patterns on public posts.

**This is not an enforcement tool.** It never reports, blocks, or mutes accounts automatically.

## Your configuration (from setup)

| Decision | Choice |
|---|---|
| Data source | Bluesky Jetstream (live) or mock — `POST_SOURCE` toggle |
| Search index | OpenSearch 2.x |
| NLP (Phase 2) | Stub interface in Phase 1 |
| Education content | AI draft — review before publishing |
| Hosting | Local Docker first |

## Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres, Redis, OpenSearch)

## Quick start

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Start infrastructure
npm run docker:up

# 3. Install dependencies
npm install

# 4. Generate Prisma client & push schema
npm run db:generate
npm run db:push

# 5. Run all services (API :4000, Web :3000, Worker)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

```
apps/web          Next.js 14 dashboard + NextAuth
apps/api          Express REST + Socket.io (/live)
apps/worker       BullMQ ingestion (MockPostSource or BlueskyPostSource)
packages/shared   Types, scoring, mock + Bluesky adapters
config/           ingestion-keywords.json (editable keyword filters)
```

## Ingestion sources

Set `POST_SOURCE` in `.env`:

| Value | Behavior |
|---|---|
| `mock` (default) | Synthetic posts on an interval — local dev/demos |
| `bluesky` | Live public [Jetstream](https://github.com/bluesky-social/jetstream-legacy) websocket firehose, keyword-filtered client-side |

### Keywords

Edit `config/ingestion-keywords.json` to change which terms are matched. The worker and dashboard chart read from this file.

### Bluesky live mode

```bash
# In .env
POST_SOURCE=bluesky
BLUESKY_JETSTREAM_HOST=jetstream2.us-east.bsky.network
INGEST_BATCH_SIZE=10
INGEST_MAX_PER_SECOND=5
INGEST_MAX_QUEUE_SIZE=500
```

Public Jetstream endpoint (verified against Bluesky docs):

`wss://<host>/subscribe?wantedCollections=app.bsky.feed.post`

Read-only — no API key, no write/report/follow actions against Bluesky accounts.

## Phases

- **Phase 1:** Mock ingestion, full UI, Postgres, OpenSearch sync, live WebSocket feed
- **Phase 2:** Wire Perspective API or HuggingFace toxicity classifier
- **Phase 3 (revised):** Bluesky Jetstream live ingestion (X API deferred — paid tier)
- **Phase 4:** Rate limiting, deployment hardening

## Compliance notes

- All scores labeled "suspected" / "pattern match"
- Report button opens X's official flow (X posts only) + copies neutral clipboard text
- Bluesky posts are read-only — no automated platform actions
- Account pages include mandatory disclaimer
