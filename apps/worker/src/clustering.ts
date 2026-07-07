import type { PrismaClient } from "@narrativewatch/database";

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 200);
}

function similarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return 1;
  const setA = new Set(na.split(" "));
  const setB = new Set(nb.split(" "));
  let inter = 0;
  for (const w of setA) {
    if (setB.has(w)) inter++;
  }
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

const SIMILARITY_THRESHOLD = 0.55;

export async function assignCluster(
  prisma: PrismaClient,
  content: string,
  keyword: string,
  postedAt: Date,
): Promise<string> {
  const since = new Date(Date.now() - 86400000);
  const recentClusters = await prisma.patternCluster.findMany({
    where: { lastSeen: { gte: since } },
    include: { posts: { take: 3, orderBy: { postedAt: "desc" } } },
    take: 30,
  });

  for (const cluster of recentClusters) {
    for (const sample of cluster.posts) {
      if (similarity(content, sample.content) >= SIMILARITY_THRESHOLD) {
        await prisma.patternCluster.update({
          where: { id: cluster.id },
          data: {
            lastSeen: postedAt,
            postCount: { increment: 1 },
          },
        });
        return cluster.id;
      }
    }
  }

  const snippet = normalizeText(content).slice(0, 60);
  const cluster = await prisma.patternCluster.create({
    data: {
      label: `Repeated phrase pattern: "${snippet}${snippet.length >= 60 ? "…" : ""}"`,
      narrative: `Suspected pattern match around keyword "${keyword}" — similar phrasing detected across multiple posts in a 24h window. This is automated analysis, not a verified conclusion.`,
      firstSeen: postedAt,
      lastSeen: postedAt,
      postCount: 1,
    },
  });

  return cluster.id;
}
