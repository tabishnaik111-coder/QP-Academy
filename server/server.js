import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import passport from "passport";


import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import profileOverviewRoutes from "./routes/profileOverviewRoutes.js";
import heroStatsRoutes from "./routes/heroStatsRoutes.js";


import {
  securityHeaders,
  generalRateLimiter,
} from "./middleware/securityMiddleware.js";

import {
  notFoundHandler,
  errorHandler,
} from "./middleware/errorMiddleware.js";

dotenv.config();
import "./config/passport.js";

const app = express();

const PORT = process.env.PORT || 5000;
const CLIENT_URL =
  process.env.CLIENT_URL || "http://localhost:5173";

app.disable("x-powered-by");

app.set("trust proxy", 1);

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(securityHeaders);

app.use(
  express.json({
    limit: "100kb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "100kb",
  })
);

app.use(cookieParser());

app.use(passport.initialize());

app.use(generalRateLimiter);

app.get("/api/health", (req, res) => {
  const databaseState =
    req.app.locals.databaseConnected === true
      ? "connected"
      : "disconnected";

  res.status(200).json({
    success: true,
    message: "QPA API is running",
    environment: process.env.NODE_ENV || "development",
    database: databaseState,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/leaderboards", leaderboardRoutes);
app.use("/api/hero", heroStatsRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/profile/overview", profileOverviewRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/payments", paymentRoutes);

app.use(notFoundHandler);

app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();

    app.locals.databaseConnected = true;

    app.listen(PORT, () => {
      console.log(`QPA server running on port ${PORT}`);
      console.log(`API: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start QPA server.");
    process.exit(1);
  }
};

startServer();