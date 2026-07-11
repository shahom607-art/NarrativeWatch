export interface KeywordSet {
  id: string;
  label: string;
  matchType?: "exact" | "loose";
  keywords: string[];
}

export interface IngestionKeywordsConfig {
  description?: string;
  sets: KeywordSet[];
}

const keywordMatchTypes = new Map<string, "exact" | "loose">();

export function setKeywordMatchType(kw: string, type: "exact" | "loose") {
  keywordMatchTypes.set(kw.toLowerCase(), type);
}

export function getKeywordMatchType(kw: string): "exact" | "loose" {
  return keywordMatchTypes.get(kw.toLowerCase()) ?? "exact";
}

export function flattenKeywords(config: IngestionKeywordsConfig): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const set of config.sets) {
    const matchType = set.matchType ?? "exact";
    for (const kw of set.keywords) {
      const trimmed = kw.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      setKeywordMatchType(trimmed, matchType);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(trimmed);
    }
  }
  return result;
}

const regexCache = new Map<string, RegExp>();

function getKeywordRegex(kw: string): RegExp {
  let regex = regexCache.get(kw);
  if (!regex) {
    const escaped = kw.toLowerCase().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    regex = new RegExp(`\\b${escaped}\\b`, 'i');
    regexCache.set(kw, regex);
  }
  return regex;
}

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "of", "in", "to", "for", "on", "with", "at", 
  "by", "from", "and", "or", "but", "about", "this", "that", "it", "they"
]);

export function matchKeywordLoose(postText: string, phrase: string, windowSize: number = 15): boolean {
  const postWords = postText.toLowerCase().match(/\b\w+\b/g) || [];
  const phraseWords = phrase.toLowerCase().match(/\b\w+\b/g) || [];
  const sigWords = phraseWords.filter(w => !STOP_WORDS.has(w));
  
  if (sigWords.length === 0) return false;
  if (sigWords.length === 1) {
    // Fall back to exact boundary check for single words or short keywords
    const regex = getKeywordRegex(sigWords[0]!);
    return regex.test(postText);
  }

  // Check sliding windows of size windowSize in postWords
  for (let i = 0; i <= postWords.length - sigWords.length; i++) {
    const windowWords = new Set(postWords.slice(i, i + windowSize));
    const allMatch = sigWords.every(sw => windowWords.has(sw));
    if (allMatch) return true;
  }
  return false;
}

export function matchKeyword(text: string, keywords: string[]): string | null {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    const type = getKeywordMatchType(kw);
    if (type === "loose") {
      if (matchKeywordLoose(lower, kw)) return kw;
    } else {
      const regex = getKeywordRegex(kw);
      if (regex.test(lower)) return kw;
    }
  }
  return null;
}
