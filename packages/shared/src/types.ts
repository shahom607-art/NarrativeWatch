export interface RawPost {
  platform: string;
  externalId: string;
  authorHandle: string;
  authorId: string;
  content: string;
  postedAt: Date;
  keywordMatched: string;
  accountCreatedAt?: Date | null;
  accountPostCount?: number | null;
  youtubeVideoId?: string | null;
  youtubeVideoTitle?: string | null;
}

export interface PostSource {
  fetchRecent(keywords: string[], sinceId?: string): Promise<RawPost[]>;
  onDelete?(callback: (externalId: string) => void): void;
  getQueueDepth?(): number;
}

export interface BotScoreBreakdown {
  postingFrequency: number;
  textDuplication: number;
  accountAgeRatio: number | null;
  accountAgeUnavailable: boolean;
  toxicityContribution: number;
  total: number;
}

export interface SourcePostDTO {
  id: string;
  platform: string;
  externalId: string;
  authorHandle: string;
  authorId: string;
  content: string;
  postedAt: string;
  ingestedAt: string;
  keywordMatched: string;
  toxicityScore: number | null;
  toxicityBreakdown: Record<string, number> | null;
  botScore: number | null;
  botScoreBreakdown: BotScoreBreakdown | null;
  clusterId: string | null;
  youtubeVideoId?: string | null;
  youtubeVideoTitle?: string | null;
}

export interface PatternClusterDTO {
  id: string;
  label: string;
  narrative: string;
  firstSeen: string;
  lastSeen: string;
  postCount: number;
}

export interface UserDTO {
  id: string;
  email: string;
  createdAt: string;
}

export interface SavedSearchDTO {
  id: string;
  label: string;
  keywords: string[];
  createdAt: string;
}

export interface TrackedAccountDTO {
  id: string;
  handle: string;
  addedAt: string;
}

export interface ReportLogDTO {
  id: string;
  postId: string;
  reportedAt: string;
  channel: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface EducationSection {
  id: string;
  title: string;
  content: string;
}

export interface EducationContent {
  sections: EducationSection[];
  lastUpdated: string;
  disclaimer: string;
}

export const CLUSTER_UPDATE_THRESHOLD = 5;

export const X_REPORT_BASE_URL = "https://twitter.com/i/safety/report_tweet";
