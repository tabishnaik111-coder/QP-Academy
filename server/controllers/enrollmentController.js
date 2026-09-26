import Enrollment from "../models/Enrollment.js";
import Course from "../models/Course.js";

export const enrollInFreeCourse = async (req, res) => {
  try {
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required.",
      });
    }

    const course = await Course.findOne({
      _id: courseId,
      published: true,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    if (course.accessType !== "free") {
      return res.status(403).json({
        success: false,
        message:
          "This course requires a paid enrollment.",
        code: "PAID_COURSE",
      });
    }

    const existingEnrollment =
      await Enrollment.findOne({
        user: req.user._id,
        course: course._id,
      });

    if (existingEnrollment) {
      return res.status(200).json({
        success: true,
        message: "You are already enrolled in this course.",
        alreadyEnrolled: true,
        enrollment: existingEnrollment,
      });
    }

    const enrollment = await Enrollment.create({
      user: req.user._id,
      course: course._id,
      accessType: "free",
      status: "active",
    });

    await Course.findByIdAndUpdate(course._id, {
      $inc: {
        enrollmentCount: 1,
      },
    });

    await req.user.updateOne({
      $addToSet: {
        enrolledCourses: course._id,
      },
    });

    return res.status(201).json({
      success: true,
      message: "You are now enrolled in this course.",
      alreadyEnrolled: false,
      enrollment,
    });
  } catch (error) {
    console.error(
      "Free course enrollment error:",
      error
    );

    if (error.code === 11000) {
      const enrollment =
        await Enrollment.findOne({
          user: req.user._id,
          course: req.body.courseId,
        });

      return res.status(200).json({
        success: true,
        message: "You are already enrolled in this course.",
        alreadyEnrolled: true,
        enrollment,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to enroll in the course right now.",
    });
  }
};

export const getMyEnrollments = async (req, res) => {
  try {
    const enrollments =
      await Enrollment.find({
        user: req.user._id,
        status: {
          $in: ["active", "completed"],
        },
      })
        .populate({
          path: "course",
          select:
            "title slug shortDescription thumbnail category difficulty accessType price currency featured totalLessons estimatedDuration rating",
        })
        .sort({
          enrolledAt: -1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      count: enrollments.length,
      enrollments,
    });
  } catch (error) {
    console.error(
      "Get enrollments error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load your enrollments.",
    });
  }
};

export const getCourseEnrollment = async (
  req,
  res
) => {
  try {
    const { courseId } = req.params;

    const enrollment =
      await Enrollment.findOne({
        user: req.user._id,
        course: courseId,
      })
        .populate({
          path: "course",
          select:
            "title slug shortDescription thumbnail category difficulty accessType price currency totalLessons estimatedDuration",
        })
        .lean();

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "You are not enrolled in this course.",
        enrolled: false,
      });
    }

    return res.status(200).json({
      success: true,
      enrolled: true,
      enrollment,
    });
  } catch (error) {
    console.error(
      "Get course enrollment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to check course enrollment.",
    });
  }
};