import express from "express";

import { getProfileOverview } from "../controllers/ProfileOverviewController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, getProfileOverview);

export default router;