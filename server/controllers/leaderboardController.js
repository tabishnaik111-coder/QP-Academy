import mongoose from "mongoose";

import Course from "../models/Course.js";
import TestResult from "../models/TestResult.js";
import DictationResult from "../models/DictationResult.js";

/*
 * =========================================
 * WHERE LEADERBOARD DATA COMES FROM
 *
 * Your learning page saves dictation attempts
 * in the DictationResult collection.
 *
 * Timed tests are saved in TestResult.
 *
 * The old leaderboard only read TestResult, so
 * dictation practice never appeared. This version
 * combines both collections into one list.
 * =========================================
 */

const RESULT_FIELDS = {
  user: 1,
  course: 1,
  score: 1,
  wpm: 1,
  accuracy: 1,
  completedAt: 1,
};

const buildLeaderboard = async (courseObjectId = null) => {
  const pipeline = [
    // Timed test results
    { $project: RESULT_FIELDS },

    // Dictation results (added to the same list)
    {
      $unionWith: {
        coll: DictationResult.collection.name,
        pipeline: [{ $project: RESULT_FIELDS }],
      },
    },
  ];

  // Course leaderboard: keep only this course
  if (courseObjectId) {
    pipeline.push({
      $match: { course: courseObjectId },
    });
  }

  pipeline.push(
    // One row per student
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

    // Attach the student's name and photo
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

    // Best score first; ties are broken by accuracy,
    // then speed, then whoever got there first.
    {
      $sort: {
        bestScore: -1,
        bestAccuracy: -1,
        bestWpm: -1,
        latestCompletedAt: 1,
      },
    },
  );

  const rows = await TestResult.aggregate(pipeline);

  return rows.map((student, index) => ({
    rank: index + 1,
    ...student,
  }));
};

export const getCourseLeaderboard = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const course = await Course.findOne({
      _id: courseId,
      published: true,
    }).lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Published course not found.",
      });
    }

    const leaderboard = await buildLeaderboard(
      new mongoose.Types.ObjectId(courseId)
    );

    return res.status(200).json({
      success: true,

      course: {
        id: course._id,
        title: course.title,
        slug: course.slug,
      },

      count: leaderboard.length,
      leaderboard,
    });
  } catch (error) {
    console.error("Course leaderboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load course leaderboard.",
    });
  }
};

export const getGlobalLeaderboard = async (req, res) => {
  try {
    const leaderboard = await buildLeaderboard();

    return res.status(200).json({
      success: true,
      count: leaderboard.length,
      leaderboard,
    });
  } catch (error) {
    console.error("Global leaderboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load global leaderboard.",
    });
  }
};