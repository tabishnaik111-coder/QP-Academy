import express from "express";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

import {
  getAdminUsers,
  updateUserStatus,
} from "../controllers/adminUserController.js";

import {
  getAdminCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  unpublishCourse,
} from "../controllers/adminCourseController.js";

import {
  getAdminModules,
  createModule,
  updateModule,
  deleteModule,
  getAdminLessons,
  createLesson,
  updateLesson,
  deleteLesson,
} from "../controllers/adminContentController.js";

import {
  getAdminAnalytics,
} from "../controllers/adminAnalyticsController.js";

const router = express.Router();

/* =========================================
   PART 36 — ANALYTICS
========================================= */

router.get(
  "/analytics",
  requireAuth,
  requireRole("admin"),
  getAdminAnalytics
);

/* =========================================
   USER MANAGEMENT
========================================= */

router.get(
  "/users",
  requireAuth,
  requireRole("admin"),
  getAdminUsers
);

router.patch(
  "/users/:userId/status",
  requireAuth,
  requireRole("admin"),
  updateUserStatus
);

/* =========================================
   COURSE MANAGEMENT
========================================= */

router.get(
  "/courses",
  requireAuth,
  requireRole("admin"),
  getAdminCourses
);

router.post(
  "/courses",
  requireAuth,
  requireRole("admin"),
  createCourse
);

router.patch(
  "/courses/:courseId",
  requireAuth,
  requireRole("admin"),
  updateCourse
);

router.delete(
  "/courses/:courseId",
  requireAuth,
  requireRole("admin"),
  deleteCourse
);

/* =========================================
   PART 35
   PUBLISH / UNPUBLISH
========================================= */

router.patch(
  "/courses/:courseId/publish",
  requireAuth,
  requireRole("admin"),
  publishCourse
);

router.patch(
  "/courses/:courseId/unpublish",
  requireAuth,
  requireRole("admin"),
  unpublishCourse
);

/* =========================================
   MODULE MANAGEMENT
========================================= */

router.get(
  "/courses/:courseId/modules",
  requireAuth,
  requireRole("admin"),
  getAdminModules
);

router.post(
  "/courses/:courseId/modules",
  requireAuth,
  requireRole("admin"),
  createModule
);

router.patch(
  "/modules/:moduleId",
  requireAuth,
  requireRole("admin"),
  updateModule
);

router.delete(
  "/modules/:moduleId",
  requireAuth,
  requireRole("admin"),
  deleteModule
);

/* =========================================
   LESSON MANAGEMENT
========================================= */

router.get(
  "/modules/:moduleId/lessons",
  requireAuth,
  requireRole("admin"),
  getAdminLessons
);

router.post(
  "/modules/:moduleId/lessons",
  requireAuth,
  requireRole("admin"),
  createLesson
);

router.patch(
  "/lessons/:lessonId",
  requireAuth,
  requireRole("admin"),
  updateLesson
);

router.delete(
  "/lessons/:lessonId",
  requireAuth,
  requireRole("admin"),
  deleteLesson
);

export default router;