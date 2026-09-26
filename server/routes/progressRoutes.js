import express from "express";

import {
  getCourseProgress,
  updateLessonProgress,
  submitDictation,
  getLatestDictationResult,
  streamDictationAudio,
} from "../controllers/progresscontroller.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/course/:courseId",
  requireAuth,
  getCourseProgress
);

router.patch(
  "/lesson/:lessonId",
  requireAuth,
  updateLessonProgress
);

router.post(
  "/dictation/:lessonId/submit",
  requireAuth,
  submitDictation
);

router.get(
  "/dictation/:lessonId/latest",
  requireAuth,
  getLatestDictationResult
);

/*
 * Protected dictation audio endpoint.
 * Only authenticated users with access to the lesson
 * will be allowed to receive the audio file.
 */
router.get(
  "/dictation/:lessonId/audio",
  requireAuth,
  streamDictationAudio
);

export default router;