# 🕵️‍♂️ NarrativeWatch

A real-time analytics dashboard for detecting, clustering, and analyzing coordinated narrative patterns and hate speech on public social media.

Currently, NarrativeWatch implements real-time hate speech detection by subscribing directly to the public Bluesky Jetstream WebSocket firehose. The pipeline filters global public posts using a loose sliding-window keyword matcher, resolves matching text to OpenAI's Moderation API (`omni-moderation-latest`) to capture raw category confidence scores (specifically mapping `hate` and `harassment`), and computes a composite threat risk index. Classified insights are saved to PostgreSQL and instantly broadcasted to connected clients via Socket.io.

### 📊 Ingestion Focus & Datasets
For its primary analysis scope, the ingestion engine monitors public safety and toxic narrative markers using two main tracking lists: **antisemitism-related terms** (targeting historic tropes, conspiracy narratives, and dogwhistles) and **anti-India propaganda terms** (targeting xenophobic slurs, coordinated regional disinformation, and sectarian hostility).

## ✨ Features

*   **Real-Time Firehose Ingestion**: Connects directly to the live Bluesky Jetstream firehose websocket, ingesting thousands of global public posts per minute with safety queues and reconnect handling.
*   **Optimized Sliding-Window Phrase Matcher**: Tokenizes posts, strips stop words, and matches target phrases loosely within a 15-word sliding window to capture paraphrased or reworded comments.
*   **OpenAI Moderation Scoring**: Integrates OpenAI's moderation endpoint to retrieve multi-category confidence scores. The `hate` and `harassment` categories are combined (using the higher of the two) into a single 0-100 score.
*   **Interactive Category Breakdown**: Displays raw categories and confidence scores inside a details disclosure element on the frontend to provide transparent analysis.
*   **Coordinated Pattern Clustering**: Automatically groups posts with similar text content within a 24-hour window using Jaccard & Cosine similarity, helping identify coordinated copy-paste campaigns.
*   **Dual-Database Search & Fallback**: Indexes posts into OpenSearch 2.x for advanced filters (keyword search, bot-score thresholds, date ranges) with a database fallback to PostgreSQL if OpenSearch is offline.
*   **Socket-Based Live Updates**: Leverages Redis-scaled Socket.io namespaces to stream new posts and cluster updates instantly to client dashboards.
*   **Compliance-Focused Report Flow**: Implements clipboard-based neutral report text generation and routes users directly to official platforms for manual review, avoiding automated platform enforcement.

---

## 🛠 Tech Stack

*   **Frontend**: Next.js 14 (App Router), React 18, NextAuth.js, Recharts, Socket.io-client, Tailwind CSS, PostCSS
*   **API Service**: Node.js, Express, TypeScript, Socket.io, `@socket.io/redis-adapter`, Redis (ioredis), Zod, JSON Web Tokens (JWT), bcryptjs
*   **Ingestion Worker**: BullMQ, tsx watch runner, ioredis
*   **Database & Search**: PostgreSQL, Prisma ORM, OpenSearch 2.x (via `@opensearch-project/opensearch`)
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
    *   `POST_SOURCE` — Ingestion source selection (`mock` or `bluesky`)
    *   `INGESTION_KEYWORDS_FILE` — JSON keyword tracking configurations path
    *   `INGESTION_KEYWORDS` — Fallback tracking keywords list
    *   `INGESTION_INTERVAL_MS` — Ingestion polling frequency
    *   `BLUESKY_JETSTREAM_HOST` — Jetstream WebSocket public endpoint host
    *   `INGEST_BATCH_SIZE` / `INGEST_MAX_QUEUE_SIZE` / `INGEST_MAX_PER_SECOND` — Ingestion rate limits
    *   `OPENAI_API_KEY` — API Key for OpenAI Moderation model requests

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
    Generate the Prisma Client and push the database schema layout:
    ```bash
    npm run db:generate
    ```
    ```bash
    npm run db:push
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
