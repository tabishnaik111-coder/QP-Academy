import express from "express";

import {
  createPaymentOrder,
  verifyPayment,
  checkCourseAccess,
} from "../controllers/paymentController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create-order", requireAuth, createPaymentOrder);

router.post("/verify", requireAuth, verifyPayment);

router.get("/access/:courseId", requireAuth, checkCourseAccess);

export default router;