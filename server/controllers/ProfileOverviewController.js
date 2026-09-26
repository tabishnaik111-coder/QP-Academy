import Enrollment from "../models/Enrollment.js";
import Course from "../models/Course.js";
import Lesson from "../models/Lesson.js";
import Test from "../models/Test.js";
import TestResult from "../models/TestResult.js";
import DictationResult from "../models/DictationResult.js";
import LessonProgress from "../models/LessonProgress.js";

/*
 * =========================================
 * PROFILE OVERVIEW
 *
 * Everything on the profile page is calculated
 * from the student's real activity:
 *
 *  - DictationResult  (dictation lessons)
 *  - TestResult       (timed tests)
 *  - LessonProgress   (completed lessons)
 *  - Enrollment       (courses)
 * =========================================
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const round1 = (value) => Math.round(value * 10) / 10;

/*
 * Turns a date into "YYYY-MM-DD" in the STUDENT'S timezone.
 * tzOffset is what the browser reports from
 * new Date().getTimezoneOffset() (minutes behind UTC).
 */
const toDayKey = (date, tzOffset) =>
  new Date(new Date(date).getTime() - tzOffset * 60000)
    .toISOString()
    .slice(0, 10);

const previousDayKey = (dayKey) =>
  new Date(Date.parse(dayKey) - DAY_MS)
    .toISOString()
    .slice(0, 10);

const calculateStreaks = (dayKeys, todayKey) => {
  const days = new Set(dayKeys);

  // Current streak: counts back from today.
  // If the student has not practiced yet today,
  // the streak is still alive if they practiced yesterday.
  let cursor = days.has(todayKey)
    ? todayKey
    : previousDayKey(todayKey);

  let currentStreak = 0;

  while (days.has(cursor)) {
    currentStreak += 1;
    cursor = previousDayKey(cursor);
  }

  // Longest streak ever
  const sorted = [...days].sort();

  let longestStreak = 0;
  let run = 0;

  sorted.forEach((day, index) => {
    if (
      index > 0 &&
      Date.parse(day) - Date.parse(sorted[index - 1]) === DAY_MS
    ) {
      run += 1;
    } else {
      run = 1;
    }

    longestStreak = Math.max(longestStreak, run);
  });

  return { currentStreak, longestStreak };
};

export const getProfileOverview = async (req, res) => {
  try {
    const userId = req.user._id;

    const tzOffset = Math.max(
      -840,
      Math.min(840, Number(req.query.tzOffset) || 0)
    );

    const [dictations, tests, completedLessons, enrollments] =
      await Promise.all([
        DictationResult.find({ user: userId })
          .select(
            "lesson course wpm accuracy score durationSeconds completedAt"
          )
          .lean(),

        TestResult.find({ user: userId })
          .select(
            "test course wpm accuracy score durationSeconds completedAt"
          )
          .lean(),

        LessonProgress.find({
          user: userId,
          completed: true,
        })
          .select("completedAt")
          .lean(),

        Enrollment.find({
          user: userId,
          status: { $in: ["active", "completed"] },
        })
          .select("status")
          .lean(),
      ]);

    /*
     * One combined list of every attempt, newest first.
     */

    const attempts = [
      ...dictations.map((item) => ({
        ...item,
        kind: "dictation",
        refId: item.lesson,
      })),

      ...tests.map((item) => ({
        ...item,
        kind: "test",
        refId: item.test,
      })),
    ].sort(
      (a, b) =>
        new Date(b.completedAt) - new Date(a.completedAt)
    );

    const count = attempts.length;

    const sumOf = (key) =>
      attempts.reduce(
        (total, item) => total + (Number(item[key]) || 0),
        0
      );

    const maxOf = (key) =>
      attempts.reduce(
        (best, item) => Math.max(best, Number(item[key]) || 0),
        0
      );

    /*
     * Streak: a day counts if the student finished a
     * dictation, a test or a lesson on that day.
     */

    const activityDates = [
      ...attempts.map((item) => item.completedAt),
      ...completedLessons
        .map((item) => item.completedAt)
        .filter(Boolean),
    ];

    const dayKeys = activityDates.map((date) =>
      toDayKey(date, tzOffset)
    );

    const { currentStreak, longestStreak } = calculateStreaks(
      dayKeys,
      toDayKey(new Date(), tzOffset)
    );

    const statistics = {
      bestWpm: maxOf("wpm"),
      bestAccuracy: maxOf("accuracy"),
      bestScore: maxOf("score"),

      testsCompleted: count,

      averageWpm: count ? round1(sumOf("wpm") / count) : 0,
      averageAccuracy: count
        ? round1(sumOf("accuracy") / count)
        : 0,
      averageScore: count ? round1(sumOf("score") / count) : 0,

      practiceMinutes: Math.round(sumOf("durationSeconds") / 60),

      lessonsCompleted: completedLessons.length,

      coursesEnrolled: enrollments.length,
      coursesCompleted: enrollments.filter(
        (item) => item.status === "completed"
      ).length,

      currentStreak,
      longestStreak,
      activeDays: new Set(dayKeys).size,
    };

    /*
     * WPM trend: the last 12 attempts, oldest first,
     * so the chart reads left to right.
     */

    const trend = attempts
      .slice(0, 12)
      .reverse()
      .map((item) => ({
        wpm: item.wpm || 0,
        accuracy: item.accuracy || 0,
        completedAt: item.completedAt,
      }));

    /*
     * Recent results with readable titles.
     */

    const recent = attempts.slice(0, 10);

    const lessonIds = recent
      .filter((item) => item.kind === "dictation")
      .map((item) => item.refId);

    const testIds = recent
      .filter((item) => item.kind === "test")
      .map((item) => item.refId);

    const courseIds = recent.map((item) => item.course);

    const [lessonDocs, testDocs, courseDocs] = await Promise.all([
      lessonIds.length
        ? Lesson.find({ _id: { $in: lessonIds } })
            .select("title")
            .lean()
        : [],

      testIds.length
        ? Test.find({ _id: { $in: testIds } })
            .select("title")
            .lean()
        : [],

      courseIds.length
        ? Course.find({ _id: { $in: courseIds } })
            .select("title slug")
            .lean()
        : [],
    ]);

    const titleMap = new Map();

    lessonDocs.forEach((doc) =>
      titleMap.set(String(doc._id), doc.title)
    );

    testDocs.forEach((doc) =>
      titleMap.set(String(doc._id), doc.title)
    );

    const courseMap = new Map(
      courseDocs.map((doc) => [String(doc._id), doc])
    );

    const recentResults = recent.map((item) => {
      const course = courseMap.get(String(item.course));

      return {
        id: item._id,
        kind: item.kind,
        title:
          titleMap.get(String(item.refId)) ||
          (item.kind === "dictation" ? "Dictation" : "Test"),
        courseTitle: course?.title || "Course",
        courseSlug: course?.slug || "",
        wpm: item.wpm || 0,
        accuracy: item.accuracy || 0,
        score: item.score || 0,
        durationSeconds: item.durationSeconds || 0,
        completedAt: item.completedAt,
      };
    });

    return res.status(200).json({
      success: true,

      profile: {
        name: req.user.name,
        email: req.user.email,
        profileImage: req.user.profileImage || "",
        memberSince: req.user.createdAt || null,
      },

      statistics,
      trend,
      recentResults,
    });
  } catch (error) {
    console.error("Profile overview error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load your profile.",
    });
  }
};