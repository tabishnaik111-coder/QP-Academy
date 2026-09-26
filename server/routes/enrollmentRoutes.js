import express from "express";

import {
  enrollInFreeCourse,
  getMyEnrollments,
  getCourseEnrollment,
} from "../controllers/enrollmentController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/free",
  requireAuth,
  enrollInFreeCourse
);

router.get(
  "/my",
  requireAuth,
  getMyEnrollments
);

router.get(
  "/course/:courseId",
  requireAuth,
  getCourseEnrollment
);

export default router;