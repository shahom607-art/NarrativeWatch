import { existsSync, readFileSync } from "fs";
import { isAbsolute, resolve } from "path";
import { flattenKeywords, type IngestionKeywordsConfig } from "./keywords";

const KEYWORDS_REL = "config/ingestion-keywords.json";

function findProjectRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    if (existsSync(resolve(dir, KEYWORDS_REL))) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(startDir, "../../..");
}

/** Resolve path to config/ingestion-keywords.json from a caller's __dirname. */
export function resolveKeywordsConfigPath(fromDir: string, envPath?: string): string {
  const projectRoot = findProjectRoot(fromDir);
  const configured = envPath ?? process.env.INGESTION_KEYWORDS_FILE;
  if (!configured) {
    return resolve(projectRoot, KEYWORDS_REL);
  }
  return isAbsolute(configured) ? configured : resolve(projectRoot, configured);
}

export function loadKeywordsFromFile(configPath: string): IngestionKeywordsConfig | null {
  if (!existsSync(configPath)) return null;
  return JSON.parse(readFileSync(configPath, "utf8")) as IngestionKeywordsConfig;
}

export function loadIngestionKeywordList(fromDir: string): string[] {
  const configPath = resolveKeywordsConfigPath(fromDir);
  const config = loadKeywordsFromFile(configPath);
  if (config) {
    const fromFile = flattenKeywords(config);
    if (fromFile.length > 0) return fromFile;
  }

  if (process.env.INGESTION_KEYWORDS) {
    return process.env.INGESTION_KEYWORDS.split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }

  return ["election", "fraud", "protest", "vaccine"];
}

export function loadIngestionKeywordsConfig(fromDir: string): IngestionKeywordsConfig | null {
  return loadKeywordsFromFile(resolveKeywordsConfigPath(fromDir));
}
