import { Router } from "express";
import { EDUCATION_CONTENT } from "../content/education";

const router = Router();

router.get("/", (_req, res) => {
  res.json(EDUCATION_CONTENT);
});

export default router;
