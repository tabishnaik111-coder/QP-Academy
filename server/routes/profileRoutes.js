import express from "express";

import {
  getMyProfile,
  getHeroStats,
} from "../controllers/profileController.js";

import {
  requireAuth,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/me",
  requireAuth,
  getMyProfile
);

router.get(
  "/hero-stats",
  requireAuth,
  getHeroStats
);

export default router;