# 🕵️‍♂️ NarrativeWatch

A real-time, hybrid analytics dashboard for detecting, clustering, and analyzing coordinated narrative patterns and toxic speech across multiple social networks.

## ✨ Features

*   **Hybrid Real-Time Ingestion Engine**: Concurrently consumes public posts across multiple platforms via a unified composite ingestion pipeline:
    *   **Bluesky**: Connects directly to the unmoderated Jetstream WebSocket firehose to analyze live posts.
    *   **Mastodon**: Streams public federation statuses in real-time via WebSocket connections to public instances (e.g., `mastodon.social`).
    *   **YouTube Comments**: Polls comments and nested replies using the official YouTube Data API v3.
*   **Quota-Aware Budget Safeguards**: YouTube ingestion features a persistent quota tracker that records daily consumption in PostgreSQL. To prevent API key blockages or unexpected billing, discovery searches and comment polls automatically pause when reaching a configured safety threshold (e.g., `9,000` units/day) and reset at midnight Pacific Time.
*   **Targeted Channel Polling**: Supports custom creator channel monitoring (configured via `YOUTUBE_CHANNELS`), alternating discovery checks between keyword search results and specific uploads playlists to track targeted discussion spaces.
*   **Coordinated Propaganda Clustering**: Automatically groups posts using Jaccard & Cosine text-similarity calculations to identify automated copy-paste operations, botnets, and coordinated narrative amplification campaigns across different platforms.
*   **OpenAI Moderation Integration**: Feeds ingested posts through the OpenAI Moderation endpoint (`omni-moderation-latest`) to retrieve raw, multi-category confidence scores, combining `hate` and `harassment` ratings into a single 0-100 severity index.
*   **Dual-Database Search Engine**: Indexes posts into OpenSearch 2.x for advanced query filters (bot-score thresholding, keyword searches, temporal ranges) with an automatic database fail-safe back to PostgreSQL if the OpenSearch instance is offline.
*   **Socket-Based Hot-Reload Updates**: Scaled Redis adapter broadcasts updates of new posts and pattern clusters live, keeping the dashboard consistent and refreshed for active sessions.
*   **Source-Specific Deep Linking**: Integrates detailed platform deep-linking, including comments targeting directly to YouTube threads (e.g., matching the exact comment using the `lc={commentId}` parameter) and status streams on Mastodon.

---

## 🛠 Tech Stack

*   **Frontend**: Next.js 14 (App Router), React 18, NextAuth.js, Recharts, Socket.io-client, Tailwind CSS, PostCSS
*   **API Service**: Node.js, Express, TypeScript, Socket.io, `@socket.io/redis-adapter`, Redis (ioredis), Zod, JSON Web Tokens (JWT), bcryptjs
*   **Ingestion Worker**: BullMQ, tsx watch runner, ioredis, OpenAI SDK, `@opensearch-project/opensearch`
*   **Database & Search**: PostgreSQL, Prisma ORM, OpenSearch 2.x
*   **Infrastructure**: Docker, Docker Compose

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v20 or higher)
*   Docker Desktop (running)

### Installation

1.  **Configure Environment Variables**
    Copy the sample environment file to create your local configurations:
    ```bash
    cp .env.example .env
    ```
    Configure the following variable names in your `.env` (never commit this file):
    *   `DATABASE_URL` — PostgreSQL connection string
    *   `REDIS_URL` — Redis connection string
    *   `OPENSEARCH_URL` — OpenSearch connection URL
    *   `JWT_SECRET` — Session signing token secret
    *   `NEXTAUTH_SECRET` — NextAuth encryption secret
    *   `NEXTAUTH_URL` — Frontend dashboard public URL
    *   `GOOGLE_CLIENT_ID` — Google OAuth Client ID
    *   `GOOGLE_CLIENT_SECRET` — Google OAuth Client Secret
    *   `OAUTH_SYNC_SECRET` — Client-to-API synchronization secret
    *   `API_URL` / `NEXT_PUBLIC_API_URL` — Backend API endpoints
    *   `NEXT_PUBLIC_WS_URL` — Socket.io WebSocket connection URL
    *   `POST_SOURCE` — Ingestion source selection (comma-separated list of `mock`, `bluesky`, `mastodon`, `youtube`)
    *   `INGESTION_KEYWORDS_FILE` — JSON keyword tracking configurations path
    *   `INGESTION_KEYWORDS` — Fallback tracking keywords list
    *   `INGESTION_INTERVAL_MS` — Ingestion polling frequency
    *   `BLUESKY_JETSTREAM_HOST` — Jetstream WebSocket public endpoint host
    *   `INGEST_BATCH_SIZE` / `INGEST_MAX_QUEUE_SIZE` / `INGEST_MAX_PER_SECOND` — Ingestion rate limits
    *   `OPENAI_API_KEY` — API Key for OpenAI Moderation model requests
    *   `MASTODON_INSTANCE_URL` — Mastodon target instance URL
    *   `MASTODON_ACCESS_TOKEN` — Mastodon access token
    *   `YOUTUBE_API_KEY` — YouTube Data API v3 Key
    *   `YOUTUBE_DAILY_QUOTA_LIMIT` — Daily quota safety cap threshold
    *   `YOUTUBE_SEARCH_INTERVAL_HOURS` — Video search discovery frequency
    *   `YOUTUBE_COMMENT_POLL_INTERVAL_MINUTES` — Comment polling check interval
    *   `YOUTUBE_POLL_REPLIES` — Toggle to pull replies in addition to parent comments
    *   `YOUTUBE_CHANNELS` — Comma-separated list of channel IDs to monitor directly

2.  **Spin Up Containerized Services**
    Start containerized PostgreSQL, Redis, and OpenSearch services:
    ```bash
    npm run docker:up
    ```

3.  **Install Workspace Dependencies**
    Install all package manager dependencies at the monorepo root:
    ```bash
    npm install
    ```

4.  **Synchronize Database Schema**
    Generate the Prisma Client and run the database schema migrations:
    ```bash
    npm run db:generate
    ```
    ```bash
    npm run db:migrate
    ```

5.  **Run Locally**
    Launch the API server, worker, and Next.js frontend concurrently in development mode:
    ```bash
    npm run dev
    ```
    Open `http://localhost:3000` to view the dashboard.

---

## 📁 Project Structure

```
├── apps/
│   ├── api/          # Express REST API & Socket.io events server
│   ├── web/          # Next.js 14 dashboard UI, NextAuth client, and Recharts graph panels
│   └── worker/       # Ingestion task worker managing scoring, clustering, and search indexing
├── packages/
│   ├── database/     # Database models schema (Prisma Client & PostgreSQL configurations)
│   └── shared/       # Shared TypeScript models, sliding window matching, and OpenAI Moderation adapters
├── config/
│   └── ingestion-keywords.json # Main JSON configurations tracking keywords list
├── docker-compose.yml # Containers definition (PostgreSQL, Redis, OpenSearch)
└── package.json       # Workspace scripts configuration
```

---

## 🗺 Roadmap / Future Improvements

*   **Webhook & Notification Rules**: Enable users to register custom alert hooks pushing real-time alerts to Slack, Discord, or email when matched post volume spikes.
*   **Vector-Embedding Semantic Similarity**: Move beyond token/Jaccard text matches to semantic vector embeddings, identifying coordinated behavior across highly paraphrased narratives.
*   **Analytics Reports Export Engine**: Integrate PDF, CSV, and JSON download exports for pattern clusters, helping compliance researchers compile findings.

---

## 📄 License

Distributed under the MIT License.
