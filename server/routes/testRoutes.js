import express from "express";

import {
  getTestById,
  startTest,
  submitTest,
} from "../controllers/testController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/:testId",
  requireAuth,
  getTestById
);

router.post(
  "/:testId/start",
  requireAuth,
  startTest
);

router.post(
  "/session/:sessionId/submit",
  requireAuth,
  submitTest
);

export default router;