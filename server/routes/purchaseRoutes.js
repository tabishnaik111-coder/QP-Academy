import express from "express";

import {
  checkCourseAccess,
} from "../controllers/purchaseController.js";

import {
  requireAuth,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/access/:courseId",
  requireAuth,
  checkCourseAccess
);

export default router;