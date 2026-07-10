# 🕵️‍♂️ NarrativeWatch

A real-time research and awareness dashboard for detecting, analyzing, and tracking suspected coordinated inauthentic behavior patterns on public social media posts.

### ✨ Features

*   **Multi-Source Ingestion Engine**: Dynamically switches between synthetic mock data generation (for offline local testing) and live streaming from the Bluesky Jetstream WebSocket firehose, implementing client-side rate limits and backpressure queues.
*   **Keyword-Based Filtering**: Targets specific research areas (such as antisemitism and disinformation narratives against India) via editable JSON keyword lists (`config/ingestion-keywords.json`).
*   **Transparent Heuristic Scoring (Bot Score)**: Computes a composite 0–100 pattern-match score for incoming posts based on weighted factors: keyword posting frequency (30%), Jaccard & Cosine text similarity against recent posts (40%), account age/post count ratio (15%), and toxicity score contribution (15%).
*   **Near-Duplicate Narrative Clustering**: Automatically groups posts with highly similar content into text clusters within a 24-hour window to map emerging, repetitive narrative campaigns.
*   **Dual-Database Search Pipeline**: Indexes incoming posts to OpenSearch 2.x for advanced keyword, date, and score querying, with automatic fallback to relational PostgreSQL querying if the search service is offline.
*   **Real-time Event Broadcasting**: Employs Socket.io namespaces scaled with a Redis adapter to instantly broadcast new posts and cluster updates to connected clients.
*   **Personal Alerts & Watchlists**: Supports secure user registration, saved searches (alert triggers), and targeted handle tracking for focused monitoring.
*   **Non-Enforcement Design**: Built for research and compliance. Never takes automated platform enforcement actions; instead, provides copy-to-clipboard neutral reporting text and redirects users to official platform safety channels.
*   **Educational Media Literacy Portal**: Integrates reviewable draft resources directly into the user interface to help analysts evaluate pattern signals and verification steps.

### 🛠 Tech Stack

*   **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, NextAuth.js, Recharts, Socket.io-client
*   **API Service**: Express, TypeScript, Node.js, Socket.io, `@socket.io/redis-adapter`, Redis, Zod, JWT, bcryptjs
*   **Ingestion Worker**: BullMQ, tsx watch runner, ioredis
*   **Database & Search**: PostgreSQL, Prisma ORM, OpenSearch 2.x (via `@opensearch-project/opensearch`)
*   **Infrastructure**: Docker, Docker Compose

### 🚀 Getting Started

#### Prerequisites
*   Node.js (v20 or higher)
*   Docker Desktop (for Postgres, Redis, and OpenSearch)

#### Installation
1.  **Configure Environment Variables**:
    Copy the sample environment file to create your local `.env`:
    ```bash
    cp .env.example .env
    ```
    Ensure the following environment variables are configured with your local or production values (never commit this file):
    *   `DATABASE_URL` — PostgreSQL connection string
    *   `REDIS_URL` — Redis connection string
    *   `OPENSEARCH_URL` — OpenSearch connection URL
    *   `JWT_SECRET` — Session token signing secret
    *   `NEXTAUTH_SECRET` — NextAuth encryption secret
    *   `NEXTAUTH_URL` — Public URL of the frontend
    *   `GOOGLE_CLIENT_ID` — Google OAuth Client ID
    *   `GOOGLE_CLIENT_SECRET` — Google OAuth Client Secret
    *   `OAUTH_SYNC_SECRET` — Shared secret for OAuth sync
    *   `API_URL` / `NEXT_PUBLIC_API_URL` — Core API connection endpoints
    *   `NEXT_PUBLIC_WS_URL` — WebSocket connection URL
    *   `POST_SOURCE` — Data ingestion source (`mock` or `bluesky`)
    *   `INGESTION_KEYWORDS_FILE` — Path to JSON keyword configuration file
    *   `INGESTION_KEYWORDS` — Fallback list of tracking keywords
    *   `INGESTION_INTERVAL_MS` — Worker polling frequency
    *   `BLUESKY_JETSTREAM_HOST` — Public Bluesky Jetstream endpoint
    *   `INGEST_BATCH_SIZE` / `INGEST_MAX_QUEUE_SIZE` / `INGEST_MAX_PER_SECOND` — Ingestion rate-limit rules
    *   `PERSPECTIVE_API_KEY` — Google Perspective API key (optional)

2.  **Start Services via Docker**:
    Launch the Postgres, Redis, and OpenSearch containers:
    ```bash
    npm run docker:up
    ```

3.  **Install Project Dependencies**:
    From the root directory, install workspace-wide dependencies:
    ```bash
    npm install
    ```

4.  **Sync Database Schema**:
    Generate the Prisma Client and apply the database schema structure:
    ```bash
    npm run db:generate
    ```
    ```bash
    npm run db:push
    ```

5.  **Run Development Servers**:
    Launch the Web frontend, API server, and Ingestion Worker concurrently:
    ```bash
    npm run dev
    ```
    Access the frontend dashboard at `http://localhost:3000`.

### 📁 Project Structure

```
├── apps/
│   ├── api/          # Express REST API, Socket.io server, and OpenSearch query integration
│   ├── web/          # Next.js 14 frontend dashboard, charts, and NextAuth integration
│   └── worker/       # BullMQ ingestion worker pulling posts, scoring, clustering, and indexing
├── packages/
│   ├── database/     # Prisma schema, migrations, and PostgreSQL client configuration
│   └── shared/       # Shared TypeScript definitions, scoring logic, and Jetstream/mock adapters
├── config/
│   └── ingestion-keywords.json # JSON configuration for targeted ingestion keyword filters
├── docker-compose.yml # Containerized services definition (PostgreSQL, Redis, OpenSearch)
└── package.json       # Monorepo workspaces definition and concurrency scripts
```

### 🗺 Roadmap / Future Improvements

*   **Live Toxicity Integration (Phase 2)**: Replace the classifier stub with live Google Perspective API call mapping using `PERSPECTIVE_API_KEY` to calculate more accurate toxicity scores.
*   **Alert Notifications**: Implement user alert rules that push webhook, email, or Slack notifications when specific keywords spike in volume or bot-score.
*   **Vector-Embedding Clustering**: Transition from basic text/Jaccard similarity scoring to semantic vector-embedding clustering for identifying coordinated narratives across paraphrased content.
*   **Advanced Analytics Export**: Allow researchers to export cluster data, post records, and trend graphs into CSV, JSON, and PDF formats for offline analysis and reporting.

### 📄 License

Distributed under the MIT License.
