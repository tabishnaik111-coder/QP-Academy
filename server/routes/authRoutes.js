import express from "express";

import {
  registerUser,
  loginUser,
  getCurrentUser,
  refreshAccessToken,
  logoutUser,
  forgotPassword,
  resetPassword,
  googleLogin,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { authRateLimiter } from "../middleware/securityMiddleware.js";
import passport from "passport";

const router = express.Router();

router.post("/register", authRateLimiter, registerUser);

router.post("/login", authRateLimiter, loginUser);

router.post(
  "/forgot-password",
  authRateLimiter,
  forgotPassword
);

router.post(
  "/reset-password",
  authRateLimiter,
  resetPassword
);

router.post("/refresh", refreshAccessToken);

router.post("/logout", logoutUser);

router.get("/me", requireAuth, getCurrentUser);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${
      process.env.CLIENT_URL || "http://localhost:5173"
    }/login?google=failed`,
  }),
  googleLogin
);

export default router;