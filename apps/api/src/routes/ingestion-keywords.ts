import { Router } from "express";
import { getIngestionKeywords, getIngestionKeywordsConfig } from "../services/keywords";

const router = Router();

router.get("/", (_req, res) => {
  const config = getIngestionKeywordsConfig();
  res.json({
    keywords: getIngestionKeywords(),
    config,
  });
});

export default router;
