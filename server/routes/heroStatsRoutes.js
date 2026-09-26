import express from "express";

import { getHeroStats } from "../controllers/heroStatsController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, getHeroStats);

export default router;