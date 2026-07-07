import {
  flattenKeywords,
  loadIngestionKeywordList,
  loadIngestionKeywordsConfig,
} from "@narrativewatch/shared";

export function getIngestionKeywordsConfig() {
  return loadIngestionKeywordsConfig(__dirname);
}

export function getIngestionKeywords(): string[] {
  const config = getIngestionKeywordsConfig();
  if (config) {
    const fromFile = flattenKeywords(config);
    if (fromFile.length > 0) return fromFile;
  }

  const fallback = loadIngestionKeywordList(__dirname);
  return fallback;
}
