import mongoose from "mongoose";

import User from "../models/User.js";
import TestResult from "../models/TestResult.js";
import DictationResult from "../models/DictationResult.js";
import Enrollment from "../models/Enrollment.js";


const RESULT_FIELDS = {
  user: 1,
  course: 1,
  score: 1,
  wpm: 1,
  accuracy: 1,
  completedAt: 1,
};
const roundNumber = (value, decimals = 1) => {
  const number = Number(value) || 0;
  const factor = 10 ** decimals;

  return Math.round(number * factor) / factor;
};

const getStartOfDay = (date) => {
  const value = new Date(date);

  value.setHours(0, 0, 0, 0);

  return value;
};

const getDateKey = (date) => {
  const value = getStartOfDay(date);

  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
};

const calculateCurrentStreak = (results) => {
  if (!results.length) {
    return 0;
  }

  const activityDates = new Set(
    results.map((result) => getDateKey(result.completedAt))
  );

  const today = getStartOfDay(new Date());
  const todayKey = getDateKey(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayKey = getDateKey(yesterday);

  let currentDate;

  if (activityDates.has(todayKey)) {
    currentDate = today;
  } else if (activityDates.has(yesterdayKey)) {
    currentDate = yesterday;
  } else {
    return 0;
  }

  let streak = 0;

  while (activityDates.has(getDateKey(currentDate))) {
    streak += 1;

    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 1);

    currentDate = previousDate;
  }

  return streak;
};

const buildHeroPerformanceData = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [testResults, dictationResults] = await Promise.all([
    TestResult.find({
      user: userObjectId,
    })
      .select(
        "wpm accuracy score completedAt course"
      )
      .sort({
        completedAt: -1,
      })
      .lean(),

    DictationResult.find({
      user: userObjectId,
    })
      .select(
        "wpm accuracy score completedAt course"
      )
      .sort({
        completedAt: -1,
      })
      .lean(),
  ]);

  const attempts = [
    ...testResults.map((result) => ({
      type: "test",
      wpm: Number(result.wpm) || 0,
      accuracy: Number(result.accuracy) || 0,
      score: Number(result.score) || 0,
      completedAt: result.completedAt,
      course: result.course,
    })),

    ...dictationResults.map((result) => ({
      type: "dictation",
      wpm: Number(result.wpm) || 0,
      accuracy: Number(result.accuracy) || 0,
      score: Number(result.score) || 0,
      completedAt: result.completedAt,
      course: result.course,
    })),
  ].sort(
    (a, b) =>
      new Date(b.completedAt).getTime() -
      new Date(a.completedAt).getTime()
  );

  const latestAttempt = attempts[0] || null;
  const previousAttempt = attempts[1] || null;

  let wpmChange = 0;

  if (
    latestAttempt &&
    previousAttempt &&
    previousAttempt.wpm > 0
  ) {
    wpmChange =
      ((latestAttempt.wpm - previousAttempt.wpm) /
        previousAttempt.wpm) *
      100;
  }

  const recentAttempts = attempts
    .slice(0, 9)
    .reverse()
    .map((attempt) => ({
      wpm: roundNumber(attempt.wpm),
      accuracy: roundNumber(attempt.accuracy),
      score: roundNumber(attempt.score),
      type: attempt.type,
      completedAt: attempt.completedAt,
    }));

  const streak = calculateCurrentStreak(attempts);

  return {
    latestWpm: roundNumber(
      latestAttempt?.wpm || 0
    ),

    wpmChange: roundNumber(wpmChange),

    latestAccuracy: roundNumber(
      latestAttempt?.accuracy || 0
    ),

    totalAttempts: attempts.length,

    streak,

    recentAttempts,
  };
};

export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select(
        "name email role profileImage createdAt lastLogin"
      )
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    const statistics = await TestResult.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(
            req.user._id
          ),
        },
      },

      {
        $group: {
          _id: null,

          testsCompleted: {
            $sum: 1,
          },

          coursesAttempted: {
            $addToSet: "$course",
          },

          bestWpm: {
            $max: "$wpm",
          },

          bestAccuracy: {
            $max: "$accuracy",
          },

          bestScore: {
            $max: "$score",
          },

          averageWpm: {
            $avg: "$wpm",
          },

          averageAccuracy: {
            $avg: "$accuracy",
          },

          averageScore: {
            $avg: "$score",
          },
        },
      },
    ]);

    const stats = statistics[0] || {
      testsCompleted: 0,
      coursesAttempted: [],
      bestWpm: 0,
      bestAccuracy: 0,
      bestScore: 0,
      averageWpm: 0,
      averageAccuracy: 0,
      averageScore: 0,
    };

    const recentResults =
      await TestResult.find({
        user: req.user._id,
      })
        .populate(
          "course",
          "title slug"
        )
        .populate(
          "test",
          "title type"
        )
        .sort({
          completedAt: -1,
        })
        .limit(10)
        .lean();

    return res.status(200).json({
      success: true,

      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },

      statistics: {
        testsCompleted:
          stats.testsCompleted,

        coursesAttempted:
          stats.coursesAttempted.length,

        bestWpm:
          Math.round(
            (stats.bestWpm || 0) * 100
          ) / 100,

        bestAccuracy:
          Math.round(
            (stats.bestAccuracy || 0) * 100
          ) / 100,

        bestScore:
          Math.round(
            (stats.bestScore || 0) * 100
          ) / 100,

        averageWpm:
          Math.round(
            (stats.averageWpm || 0) * 100
          ) / 100,

        averageAccuracy:
          Math.round(
            (stats.averageAccuracy || 0) * 100
          ) / 100,

        averageScore:
          Math.round(
            (stats.averageScore || 0) * 100
          ) / 100,
      },

      recentResults,
    });
  } catch (error) {
    console.error(
      "Get profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load student profile.",
    });
  }
};

const getMyGlobalLeaderboardRank = async (userId) => {
  const rows = await TestResult.aggregate([
    { $project: RESULT_FIELDS },

    {
      $unionWith: {
        coll: DictationResult.collection.name,
        pipeline: [{ $project: RESULT_FIELDS }],
      },
    },

    {
      $group: {
        _id: "$user",

        bestScore: {
          $max: "$score",
        },

        bestWpm: {
          $max: "$wpm",
        },

        bestAccuracy: {
          $max: "$accuracy",
        },

        latestCompletedAt: {
          $max: "$completedAt",
        },
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

    {
      $unwind: "$user",
    },

    {
      $match: {
        "user.isActive": true,
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

    {
      $project: {
        _id: 1,
      },
    },
  ]);

  const userIndex = rows.findIndex(
    (entry) =>
      String(entry._id) === String(userId)
  );

  if (userIndex === -1) {
  return null;
}

  return userIndex + 1;
};

export const getHeroStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [
      performance,
      latestEnrollment,
      globalRank,
    ] = await Promise.all([
      buildHeroPerformanceData(userId),

      Enrollment.findOne({
        user: userId,
        status: {
          $in: ["active", "completed"],
        },
      })
        .sort({
          enrolledAt: -1,
        })
        .select(
          "course progressPercentage status enrolledAt"
        )
        .populate({
          path: "course",
          select: "title slug",
        })
        .lean(),

      getMyGlobalLeaderboardRank(userId),
    ]);

    const courseProgress =
      latestEnrollment
        ? roundNumber(
            latestEnrollment.progressPercentage
          )
        : 0;

    return res.status(200).json({
      success: true,

      heroStats: {
        latestWpm: performance.latestWpm,

        wpmChange: performance.wpmChange,

        latestAccuracy:
          performance.latestAccuracy,

        totalAttempts:
          performance.totalAttempts,

        streak: performance.streak,

        courseProgress,

        globalRank,

        course: latestEnrollment
          ? {
              id:
                latestEnrollment.course?._id ||
                null,

              title:
                latestEnrollment.course?.title ||
                "",

              slug:
                latestEnrollment.course?.slug ||
                "",

              status:
                latestEnrollment.status,
            }
          : null,

        recentAttempts:
          performance.recentAttempts,
      },
    });
  } catch (error) {
    console.error(
      "Get Hero statistics error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load Hero statistics.",
    });
  }
};