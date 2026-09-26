import express from "express";

import {
  getPublishedCourses,
  getCourseBySlug,
  createCourse,
  updateCourse,
  deleteCourse,
} from "../controllers/courseController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

/*
 * Public course endpoints
 */

router.get("/", getPublishedCourses);

router.get("/:slug", getCourseBySlug);

/*
 * Admin course endpoints
 */

router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  createCourse
);

router.put(
  "/:id",
  requireAuth,
  requireRole("admin"),
  updateCourse
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  deleteCourse
);

export default router;