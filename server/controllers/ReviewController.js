import mongoose from "mongoose";

import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import Review from "../models/Review.js";

const MAX_COMMENT_LENGTH = 1000;
const REVIEWS_LIMIT = 50;

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/*
 * Only published courses can be reviewed.
 */
const findPublishedCourse = (courseId) =>
  Course.findOne({
    _id: courseId,
    published: true,
  })
    .select("_id title")
    .lean();

/*
 * Only students enrolled in the course
 * (free enrollment or paid purchase) may review.
 */
const isEnrolled = async (userId, courseId) => {
  const enrollment = await Enrollment.findOne({
    user: userId,
    course: courseId,
    status: { $in: ["active", "completed"] },
  }).lean();

  return Boolean(enrollment);
};

/*
 * Average, total and the 1-5 star breakdown.
 */
const buildSummary = async (courseId) => {
  const rows = await Review.aggregate([
    {
      $match: {
        course: new mongoose.Types.ObjectId(courseId),
      },
    },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
  ]);

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  let count = 0;
  let sum = 0;

  rows.forEach((row) => {
    breakdown[row._id] = row.count;
    count += row.count;
    sum += row._id * row.count;
  });

  const average =
    count === 0 ? 0 : Math.round((sum / count) * 10) / 10;

  return { average, count, breakdown };
};

/*
 * Keeps Course.rating up to date so the course
 * cards and the course page show the same numbers.
 */
const syncCourseRating = async (courseId) => {
  const summary = await buildSummary(courseId);

  await Course.findByIdAndUpdate(courseId, {
    $set: {
      "rating.average": summary.average,
      "rating.count": summary.count,
    },
  });

  return summary;
};

const formatReview = (review) => ({
  id: review._id,
  rating: review.rating,
  comment: review.comment,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
});

/* =========================================
   GET REVIEWS FOR A COURSE (public)
========================================= */

export const getCourseReviews = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!isValidId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const course = await findPublishedCourse(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Published course not found.",
      });
    }

    const [reviews, summary] = await Promise.all([
      Review.find({ course: courseId })
        .sort({ createdAt: -1 })
        .limit(REVIEWS_LIMIT)
        .populate({
          path: "user",
          select: "name profileImage isActive",
        })
        .lean(),

      buildSummary(courseId),
    ]);

    const visibleReviews = reviews
      .filter(
        (review) =>
          review.user && review.user.isActive !== false
      )
      .map((review) => ({
        ...formatReview(review),
        userId: review.user._id,
        name: review.user.name,
        profileImage: review.user.profileImage || "",
      }));

    return res.status(200).json({
      success: true,
      summary,
      reviews: visibleReviews,
    });
  } catch (error) {
    console.error("Get course reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load reviews.",
    });
  }
};

/* =========================================
   GET MY REVIEW + AM I ALLOWED TO REVIEW
========================================= */

export const getMyReview = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!isValidId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const [review, canReview] = await Promise.all([
      Review.findOne({
        user: req.user._id,
        course: courseId,
      }).lean(),

      isEnrolled(req.user._id, courseId),
    ]);

    return res.status(200).json({
      success: true,
      canReview,
      review: review ? formatReview(review) : null,
    });
  } catch (error) {
    console.error("Get my review error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load your review.",
    });
  }
};

/* =========================================
   ADD OR UPDATE MY REVIEW
========================================= */

export const saveMyReview = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!isValidId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const rating = Number(req.body.rating);

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Please choose a rating from 1 to 5 stars.",
      });
    }

    const comment =
      typeof req.body.comment === "string"
        ? req.body.comment.trim()
        : "";

    if (comment.length > MAX_COMMENT_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Your review cannot be longer than ${MAX_COMMENT_LENGTH} characters.`,
      });
    }

    const course = await findPublishedCourse(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Published course not found.",
      });
    }

    const enrolled = await isEnrolled(
      req.user._id,
      course._id
    );

    if (!enrolled) {
      return res.status(403).json({
        success: false,
        message: "Only enrolled students can review this course.",
      });
    }

    const review = await Review.findOneAndUpdate(
      {
        user: req.user._id,
        course: course._id,
      },
      {
        rating,
        comment,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    const summary = await syncCourseRating(course._id);

    return res.status(200).json({
      success: true,
      message: "Your review has been saved.",
      review: formatReview(review),
      summary,
    });
  } catch (error) {
    console.error("Save review error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save your review.",
    });
  }
};

/* =========================================
   DELETE MY REVIEW
========================================= */

export const deleteMyReview = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!isValidId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const deleted = await Review.findOneAndDelete({
      user: req.user._id,
      course: courseId,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "You have not reviewed this course.",
      });
    }

    const summary = await syncCourseRating(courseId);

    return res.status(200).json({
      success: true,
      message: "Your review has been deleted.",
      summary,
    });
  } catch (error) {
    console.error("Delete review error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete your review.",
    });
  }
};