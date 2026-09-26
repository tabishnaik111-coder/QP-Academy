import Enrollment from "../models/Enrollment.js";
import Course from "../models/Course.js";
import TestResult from "../models/TestResult.js";
import DictationResult from "../models/DictationResult.js";
import LessonProgress from "../models/LessonProgress.js";

/*
 * =========================================
 * HERO STATS (home page performance card)
 *
 * Everything is calculated from the student's real
 * activity, combining timed tests and dictations:
 *
 *  - latest WPM / accuracy and the change vs earlier attempts
 *  - number of attempts and current streak
 *  - progress of the course they are working on
 *  - global leaderboard rank
 *
 * The response keeps the same shape the Hero component
 * already expects: { success, heroStats: { ... } }
 * =========================================
 */

const DAY_MS = 24 * 60 * 60 * 1000;

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

const round1 = (value) => Math.round(value * 10) / 10;

const toDayKey = (date, tzOffset) =>
  new Date(new Date(date).getTime() - tzOffset * 60000)
    .toISOString()
    .slice(0, 10);

const previousDayKey = (dayKey) =>
  new Date(Date.parse(dayKey) - DAY_MS)
    .toISOString()
    .slice(0, 10);

/*
 * Current streak: consecutive days with activity, counted
 * back from today. It stays alive if the student has not
 * practiced yet today but did yesterday.
 */
const calculateCurrentStreak = (dayKeys, todayKey) => {
  const days = new Set(dayKeys);

  let cursor = days.has(todayKey)
    ? todayKey
    : previousDayKey(todayKey);

  let streak = 0;

  while (days.has(cursor)) {
    streak += 1;
    cursor = previousDayKey(cursor);
  }

  return streak;
};

/*
 * Position of the student on the global leaderboard,
 * using the same ordering as the public leaderboard.
 */
const getGlobalRank = async (userId) => {
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
        bestScore: { $max: "$score" },
        bestWpm: { $max: "$wpm" },
        bestAccuracy: { $max: "$accuracy" },
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
      $sort: {
        bestScore: -1,
        bestAccuracy: -1,
        bestWpm: -1,
        latestCompletedAt: 1,
      },
    },

    { $project: { _id: 1 } },
  ]);

  const index = rows.findIndex(
    (row) => String(row._id) === String(userId)
  );

  return {
    globalRank: index === -1 ? null : index + 1,
    totalRanked: rows.length,
  };
};

/*
 * The course to show in the progress bar: the unfinished
 * course the student touched most recently. If everything
 * is finished, the most recent finished course is used.
 */
const getCurrentCourseProgress = async (userId) => {
  const [enrollments, lastAccess] = await Promise.all([
    Enrollment.find({ user: userId, ...ACTIVE_ENROLLMENT })
      .select("course status progressPercentage enrolledAt")
      .lean(),

    LessonProgress.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: "$course",
          lastAccessedAt: { $max: "$lastAccessedAt" },
        },
      },
    ]),
  ]);

  if (!enrollments.length) {
    return {
      courseProgress: 0,
      courseTitle: "",
      courseSlug: "",
      overallProgress: 0,
      coursesInProgress: 0,
      totalEnrolledCourses: 0,
    };
  }

  /*
   * Overall progress: the average of progressPercentage
   * across every active/completed enrollment. This is the
   * number the homepage progress bar shows, since it
   * represents "progress across all my courses" rather
   * than just the one the student touched last.
   */

  const overallProgress = Math.round(
    enrollments.reduce(
      (total, item) => total + (Number(item.progressPercentage) || 0),
      0
    ) / enrollments.length
  );

  const coursesInProgress = enrollments.filter(
    (item) => item.status !== "completed"
  ).length;

  const lastAccessMap = new Map(
    lastAccess.map((row) => [
      String(row._id),
      new Date(row.lastAccessedAt || 0).getTime(),
    ])
  );

  const ranked = [...enrollments].sort((a, b) => {
    // Unfinished courses first
    const aDone = a.status === "completed" ? 1 : 0;
    const bDone = b.status === "completed" ? 1 : 0;

    if (aDone !== bDone) return aDone - bDone;

    // Then the most recently practiced
    const aAccess = lastAccessMap.get(String(a.course)) || 0;
    const bAccess = lastAccessMap.get(String(b.course)) || 0;

    if (aAccess !== bAccess) return bAccess - aAccess;

    // Then the most recently enrolled
    return (
      new Date(b.enrolledAt || 0) - new Date(a.enrolledAt || 0)
    );
  });

  const current = ranked[0];

  const course = await Course.findById(current.course)
    .select("title slug")
    .lean();

  return {
    courseProgress: Math.round(current.progressPercentage || 0),
    courseTitle: course?.title || "",
    courseSlug: course?.slug || "",
    overallProgress,
    coursesInProgress,
    totalEnrolledCourses: enrollments.length,
  };
};

export const getHeroStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const tzOffset = Math.max(
      -840,
      Math.min(840, Number(req.query.tzOffset) || 0)
    );

    const [
      dictations,
      tests,
      completedLessons,
      rank,
      progress,
    ] = await Promise.all([
      DictationResult.find({ user: userId })
        .select("wpm accuracy completedAt")
        .lean(),

      TestResult.find({ user: userId })
        .select("wpm accuracy completedAt")
        .lean(),

      LessonProgress.find({ user: userId, completed: true })
        .select("completedAt")
        .lean(),

      getGlobalRank(userId),

      getCurrentCourseProgress(userId),
    ]);

    // Every attempt, newest first
    const attempts = [...dictations, ...tests].sort(
      (a, b) =>
        new Date(b.completedAt) - new Date(a.completedAt)
    );

    const latest = attempts[0] || null;

    /*
     * WPM change: the latest attempt compared with the
     * average of the (up to) five attempts before it.
     */

    const earlier = attempts.slice(1, 6);

    let wpmChange = 0;

    if (latest && earlier.length) {
      const earlierAverage =
        earlier.reduce(
          (total, item) => total + (Number(item.wpm) || 0),
          0
        ) / earlier.length;

      if (earlierAverage > 0) {
        wpmChange = round1(
          (((Number(latest.wpm) || 0) - earlierAverage) /
            earlierAverage) *
            100
        );
      }
    }

    // Streak: attempts and completed lessons both count
    const dayKeys = [
      ...attempts.map((item) => item.completedAt),
      ...completedLessons
        .map((item) => item.completedAt)
        .filter(Boolean),
    ].map((date) => toDayKey(date, tzOffset));

    const streak = calculateCurrentStreak(
      dayKeys,
      toDayKey(new Date(), tzOffset)
    );

    // Last 9 attempts, oldest first, for the bar graph
    const recentAttempts = attempts
      .slice(0, 9)
      .reverse()
      .map((item) => ({
        wpm: Number(item.wpm) || 0,
        accuracy: Number(item.accuracy) || 0,
        completedAt: item.completedAt,
      }));

    return res.status(200).json({
      success: true,

      heroStats: {
        latestWpm: latest ? Number(latest.wpm) || 0 : 0,
        wpmChange,
        latestAccuracy: latest ? Number(latest.accuracy) || 0 : 0,
        totalAttempts: attempts.length,
        streak,

        courseProgress: progress.courseProgress,
        courseTitle: progress.courseTitle,
        courseSlug: progress.courseSlug,
        overallProgress: progress.overallProgress,
        coursesInProgress: progress.coursesInProgress,
        totalEnrolledCourses: progress.totalEnrolledCourses,

        globalRank: rank.globalRank,
        totalRanked: rank.totalRanked,

        recentAttempts,
      },
    });
  } catch (error) {
    console.error("Hero stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load your statistics.",
    });
  }
};