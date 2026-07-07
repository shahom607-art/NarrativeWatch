import {
  loadIngestionKeywordList,
  loadIngestionKeywordsConfig,
} from "@narrativewatch/shared";

export function loadIngestionKeywords(): string[] {
  return loadIngestionKeywordList(__dirname);
}

export function loadKeywordsConfig() {
  return loadIngestionKeywordsConfig(__dirname);
}
