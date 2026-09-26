import express from "express";

import {
  getCourseLeaderboard,
  getGlobalLeaderboard,
} from "../controllers/leaderboardController.js";

const router = express.Router();

router.get(
  "/global",
  getGlobalLeaderboard
);

router.get(
  "/course/:courseId",
  getCourseLeaderboard
);

export default router;