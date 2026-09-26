import mongoose from "mongoose";

import Course from "../models/Course.js";
import Purchase from "../models/Purchase.js";
import Enrollment from "../models/Enrollment.js";
import TestResult from "../models/TestResult.js";
import DictationResult from "../models/DictationResult.js";
import User from "../models/User.js";

/*
 * =========================================
 * WHERE THE DATA COMES FROM
 *
 *  - TestResult       timed tests
 *  - DictationResult  dictation lessons
 *  - Enrollment       every free enrollment and paid purchase
 *  - Purchase         payments
 *
 * The leaderboard and the "tests completed" number
 * combine TestResult and DictationResult, because
 * students practice mostly through dictation lessons.
 * =========================================
 */

const ACTIVE_ENROLLMENT = {
  status: { $in: ["active", "completed"] },
};

const RESULT_FIELDS = {
  user: 1,
  course: 1,
  score: 1,
  wpm: 1,
  accuracy: 1,
  completedAt: 1,
};

const getLeaderboard = async (courseId = "") => {
  const pipeline = [
    // Timed test results
    { $project: RESULT_FIELDS },

    // Dictation results, added to the same list
    {
      $unionWith: {
        coll: DictationResult.collection.name,
        pipeline: [{ $project: RESULT_FIELDS }],
      },
    },
  ];

  if (courseId) {
    pipeline.push({
      $match: {
        course: new mongoose.Types.ObjectId(courseId),
      },
    });
  }

  pipeline.push(
    {
      $group: {
        _id: "$user",
        bestScore: { $max: "$score" },
        bestWpm: { $max: "$wpm" },
        bestAccuracy: { $max: "$accuracy" },
        testsCompleted: { $sum: 1 },
        courses: { $addToSet: "$course" },
        latestCompletedAt: { $max: "$completedAt" },
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },

    { $unwind: "$user" },

    { $match: { "user.isActive": true } },

    {
      $project: {
        _id: 0,
        userId: "$_id",
        name: "$user.name",
        profileImage: "$user.profileImage",
        bestScore: 1,
        bestWpm: 1,
        bestAccuracy: 1,
        testsCompleted: 1,
        coursesCompleted: { $size: "$courses" },
        latestCompletedAt: 1,
      },
    },

    {
      $sort: {
        bestScore: -1,
        bestAccuracy: -1,
        bestWpm: -1,
        latestCompletedAt: 1,
      },
    },

    { $limit: 10 }
  );

  const leaderboard = await TestResult.aggregate(pipeline);

  return leaderboard.map((student, index) => ({
    rank: index + 1,
    ...student,
  }));
};

export const getAdminAnalytics = async (req, res) => {
  try {
    const { courseId = "" } = req.query;

    if (
      courseId &&
      !mongoose.Types.ObjectId.isValid(courseId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const [
      totalUsers,
      activeUsers,
      totalCourses,
      publishedCourses,
      totalPurchases,
      paidPurchases,
      revenueResult,
      totalTestResults,
      totalDictationResults,
      totalEnrollments,
      recentPurchases,
      recentEnrollments,
    ] = await Promise.all([
      User.countDocuments(),

      User.countDocuments({ isActive: true }),

      Course.countDocuments(),

      Course.countDocuments({ published: true }),

      Purchase.countDocuments(),

      Purchase.countDocuments({ status: "paid" }),

      Purchase.aggregate([
        { $match: { status: "paid" } },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),

      TestResult.countDocuments(),

      DictationResult.countDocuments(),

      Enrollment.countDocuments(ACTIVE_ENROLLMENT),

      Purchase.find()
        .populate("user", "name email")
        .populate("course", "title slug")
        .sort({ purchasedAt: -1 })
        .limit(25)
        .lean(),

      Enrollment.find(ACTIVE_ENROLLMENT)
        .populate("user", "name email")
        .populate("course", "title slug")
        .sort({ enrolledAt: -1 })
        .limit(25)
        .lean(),
    ]);

    /*
     * Recent enrollments, newest first, with the real
     * enrollment date (free enrollments and paid purchases).
     */

    const enrollments = recentEnrollments
      .filter((item) => item.user && item.course)
      .map((item) => ({
        userId: item.user._id,
        userName: item.user.name,
        userEmail: item.user.email,
        courseId: item.course._id,
        courseTitle: item.course.title,
        courseSlug: item.course.slug,
        accessType: item.accessType,
        enrolledAt: item.enrolledAt || item.createdAt || null,
      }));

    const leaderboard = await getLeaderboard(courseId);

    return res.status(200).json({
      success: true,

      stats: {
        totalUsers,
        activeUsers,
        totalCourses,
        publishedCourses,
        totalEnrollments,
        totalPurchases,
        paidPurchases,
        totalRevenue: revenueResult[0]?.total || 0,

        // Dictation attempts + timed tests
        totalTests: totalTestResults + totalDictationResults,
      },

      purchases: recentPurchases,

      enrollments,

      leaderboard,

      leaderboardScope: courseId || "global",
    });
  } catch (error) {
    console.error("Admin analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load admin analytics.",
    });
  }
};