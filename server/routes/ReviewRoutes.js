import express from "express";

import {
  getCourseReviews,
  getMyReview,
  saveMyReview,
  deleteMyReview,
} from "../controllers/ReviewController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public: anyone can read a course's reviews
router.get("/course/:courseId", getCourseReviews);

// Logged-in students
router.get("/course/:courseId/mine", requireAuth, getMyReview);
router.post("/course/:courseId", requireAuth, saveMyReview);
router.delete("/course/:courseId", requireAuth, deleteMyReview);

export default router;