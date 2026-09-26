import mongoose from "mongoose";

import Course from "../models/Course.js";
import Purchase from "../models/Purchase.js";

export const checkCourseAccess = async (
  req,
  res
) => {
  try {
    const { courseId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        courseId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const course =
      await Course.findOne({
        _id: courseId,
        published: true,
      })
        .select(
          "_id title price published"
        )
        .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message:
          "Published course not found.",
      });
    }

    /*
     * Free courses are accessible without
     * a purchase.
     */

    if (
      !course.price ||
      course.price <= 0
    ) {
      return res.status(200).json({
        success: true,
        hasAccess: true,
        accessType: "free",
      });
    }

    /*
     * Paid courses require a successful
     * purchase belonging to this user.
     */

    const purchase =
      await Purchase.findOne({
        user: req.user._id,
        course: course._id,
        status: "paid",
      })
        .sort({
          purchasedAt: -1,
        })
        .lean();

    if (!purchase) {
      return res.status(200).json({
        success: true,
        hasAccess: false,
        accessType: "paid",
      });
    }

    return res.status(200).json({
      success: true,
      hasAccess: true,
      accessType: "paid",
      purchase: {
        id: purchase._id,
        purchasedAt:
          purchase.purchasedAt,
      },
    });
  } catch (error) {
    console.error(
      "Course access error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to check course access.",
    });
  }
};