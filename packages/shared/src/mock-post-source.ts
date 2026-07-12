import type { PostSource, RawPost } from "./types";

const SAMPLE_HANDLES = [
  "news_observer_42",
  "citizen_voice_x",
  "info_stream_daily",
  "local_updates_now",
  "public_pulse_feed",
  "community_alert_hub",
  "trend_watch_media",
  "open_discourse_net",
];

const PHRASE_TEMPLATES: Record<string, string[]> = {
  election: [
    "Breaking: concerns raised about {topic} in recent reports. Many are asking questions.",
    "Why isn't mainstream media covering {topic}? Something doesn't add up here.",
    "URGENT: new information about {topic} — share before it's taken down!",
    "People are waking up to the truth about {topic}. Don't stay silent.",
  ],
  fraud: [
    "Alert: pattern of {topic} activity detected. Stay vigilant and verify sources.",
    "This {topic} situation keeps getting worse. When will officials respond?",
    "Repeated reports of {topic} — coincidence or coordination? You decide.",
  ],
  protest: [
    "Large gathering forming around {topic}. Live updates from the ground.",
    "Citizens mobilizing over {topic}. History in the making.",
    "Spread the word: {topic} rally this weekend. Peaceful but firm.",
  ],
  vaccine: [
    "New questions emerging about {topic}. Independent researchers speaking out.",
    "Why are dissenting voices on {topic} being suppressed?",
    "Personal story: my experience with {topic} changed my perspective entirely.",
  ],
};

const DEFAULT_TEMPLATES = [
  "Discussion heating up around {topic}. Multiple accounts posting similar messages.",
  "Has anyone else noticed the surge in {topic} posts today?",
  "Pattern match suspected: repeated phrasing about {topic}.",
];

let postCounter = 0;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function generateExternalId(): string {
  postCounter += 1;
  return `mock_${Date.now()}_${postCounter}`;
}

export class MockPostSource implements PostSource {
  private lastSinceId?: string;

  async fetchRecent(keywords: string[], sinceId?: string): Promise<RawPost[]> {
    const effectiveSince = sinceId ?? this.lastSinceId;
    void effectiveSince;

    const batchSize = Math.floor(Math.random() * 4) + 2;
    const posts: RawPost[] = [];

    for (let i = 0; i < batchSize; i++) {
      const keyword = pick(keywords.length > 0 ? keywords : ["general"]);
      const templates = PHRASE_TEMPLATES[keyword] ?? DEFAULT_TEMPLATES;
      const template = pick(templates);
      const content = template.replace(/\{topic\}/g, keyword);

      const duplicateRoll = Math.random();
      const finalContent =
        duplicateRoll > 0.65 && posts.length > 0
          ? posts[0]!.content
          : duplicateRoll > 0.5
            ? `${content} #${keyword}`
            : content;

      const handle = pick(SAMPLE_HANDLES);
      const authorId = `author_${handle}`;
      const accountAgeDays = Math.floor(Math.random() * 3650);
      const accountCreatedAt = new Date(Date.now() - accountAgeDays * 86400000);

      posts.push({
        platform: "x",
        externalId: generateExternalId(),
        authorHandle: handle,
        authorId,
        content: finalContent,
        postedAt: new Date(Date.now() - Math.floor(Math.random() * 3600000)),
        keywordMatched: keyword,
        accountCreatedAt,
        accountPostCount: Math.floor(Math.random() * 5000) + 1,
      });
    }

    if (posts.length > 0) {
      this.lastSinceId = posts[posts.length - 1]!.externalId;
    }

    return posts;
  }

  onDelete(callback: (externalId: string) => void): void {}

  getQueueDepth(): number {
    return 0;
  }
}
