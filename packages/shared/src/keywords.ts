export interface KeywordSet {
  id: string;
  label: string;
  keywords: string[];
}

export interface IngestionKeywordsConfig {
  description?: string;
  sets: KeywordSet[];
}

export function flattenKeywords(config: IngestionKeywordsConfig): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const set of config.sets) {
    for (const kw of set.keywords) {
      const trimmed = kw.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(trimmed);
    }
  }
  return result;
}

export function matchKeyword(text: string, keywords: string[]): string | null {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) return kw;
  }
  return null;
}
