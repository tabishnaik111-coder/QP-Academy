import Course from "../models/Course.js";

const buildCourseData = (body) => {
  const {
    title,
    slug,
    shortDescription,
    description,
    category,
    level,
    difficulty,
    price,
    thumbnail,
    isFree,
    accessType,
    featured,
  } = body;

  const resolvedAccessType =
    accessType ||
    (Boolean(isFree) ? "free" : "paid");

  const resolvedDifficulty =
    difficulty ||
    (level
      ? String(level).toLowerCase()
      : "beginner");

  return {
    title: title?.trim(),
    slug: slug?.trim().toLowerCase(),
    shortDescription:
      shortDescription?.trim() || "",
    description:
      description?.trim() || "",
    category:
      category?.trim() || "",

    // Keep compatibility with the existing
    // admin dashboard fields.
    level:
      level?.trim() || "Beginner",

    difficulty: resolvedDifficulty,

    accessType: resolvedAccessType,

    price: Number(price) || 0,

    thumbnail:
      thumbnail?.trim() || "",

    isFree: Boolean(isFree),

    featured: Boolean(featured),
  };
};

/* =========================================
   GET ALL ADMIN COURSES
   Includes BOTH draft and published courses.
========================================= */

export const getAdminCourses = async (
  req,
  res
) => {
  try {
    const courses = await Course.find()
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    console.error(
      "Admin courses error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load courses.",
    });
  }
};

/* =========================================
   CREATE COURSE
   Every newly created course is DRAFT.
========================================= */

export const createCourse = async (
  req,
  res
) => {
  try {
    const courseData =
      buildCourseData(req.body);

    if (!courseData.title) {
      return res.status(400).json({
        success: false,
        message:
          "Course title is required.",
      });
    }

    if (!courseData.slug) {
      return res.status(400).json({
        success: false,
        message:
          "Course slug is required.",
      });
    }

    if (courseData.price < 0) {
      return res.status(400).json({
        success: false,
        message:
          "Course price cannot be negative.",
      });
    }

    if (
      ![
        "beginner",
        "intermediate",
        "advanced",
      ].includes(courseData.difficulty)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid course difficulty.",
      });
    }

    if (
      !["free", "paid"].includes(
        courseData.accessType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid course access type.",
      });
    }

    const existingCourse =
      await Course.findOne({
        slug: courseData.slug,
      });

    if (existingCourse) {
      return res.status(409).json({
        success: false,
        message:
          "A course with this slug already exists.",
      });
    }

    /*
      IMPORTANT:
      A newly created course is ALWAYS a draft.

      Admin must explicitly publish it.
    */

    courseData.published = false;
    courseData.publishedAt = null;

    const course =
      await Course.create(courseData);

    return res.status(201).json({
      success: true,
      message:
        "Course created as draft.",
      course,
    });
  } catch (error) {
    console.error(
      "Create course error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create course.",
    });
  }
};

/* =========================================
   UPDATE COURSE
   Updating a course does NOT automatically
   publish or unpublish it.
========================================= */

export const updateCourse = async (
  req,
  res
) => {
  try {
    const { courseId } =
      req.params;

    const courseData =
      buildCourseData(req.body);

    if (!courseData.title) {
      return res.status(400).json({
        success: false,
        message:
          "Course title is required.",
      });
    }

    if (!courseData.slug) {
      return res.status(400).json({
        success: false,
        message:
          "Course slug is required.",
      });
    }

    if (courseData.price < 0) {
      return res.status(400).json({
        success: false,
        message:
          "Course price cannot be negative.",
      });
    }

    if (
      ![
        "beginner",
        "intermediate",
        "advanced",
      ].includes(courseData.difficulty)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid course difficulty.",
      });
    }

    if (
      !["free", "paid"].includes(
        courseData.accessType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid course access type.",
      });
    }

    const duplicateCourse =
      await Course.findOne({
        slug: courseData.slug,
        _id: {
          $ne: courseId,
        },
      });

    if (duplicateCourse) {
      return res.status(409).json({
        success: false,
        message:
          "Another course already uses this slug.",
      });
    }

    /*
      Do NOT accept `published` from the
      normal edit form.

      Publishing is handled by the dedicated
      publish/unpublish endpoints below.
    */

    const course =
      await Course.findByIdAndUpdate(
        courseId,
        courseData,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!course) {
      return res.status(404).json({
        success: false,
        message:
          "Course not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Course updated successfully.",
      course,
    });
  } catch (error) {
    console.error(
      "Update course error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update course.",
    });
  }
};

/* =========================================
   PUBLISH COURSE
========================================= */

export const publishCourse = async (
  req,
  res
) => {
  try {
    const { courseId } =
      req.params;

    const course =
      await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message:
          "Course not found.",
      });
    }

    if (course.published) {
      return res.status(400).json({
        success: false,
        message:
          "Course is already published.",
        course,
      });
    }

    /*
      Publish the course and record
      the exact publishing time.
    */

    course.published = true;
    course.publishedAt = new Date();

    await course.save();

    return res.status(200).json({
      success: true,
      message:
        "Course published successfully.",
      course,
    });
  } catch (error) {
    console.error(
      "Publish course error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to publish course.",
    });
  }
};

/* =========================================
   UNPUBLISH COURSE
========================================= */

export const unpublishCourse = async (
  req,
  res
) => {
  try {
    const { courseId } =
      req.params;

    const course =
      await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message:
          "Course not found.",
      });
    }

    if (!course.published) {
      return res.status(400).json({
        success: false,
        message:
          "Course is already unpublished.",
        course,
      });
    }

    /*
      Unpublish the course.

      The course remains in the database
      and remains visible to the admin.
    */

    course.published = false;
    course.publishedAt = null;

    await course.save();

    return res.status(200).json({
      success: true,
      message:
        "Course unpublished successfully.",
      course,
    });
  } catch (error) {
    console.error(
      "Unpublish course error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to unpublish course.",
    });
  }
};

/* =========================================
   DELETE COURSE
========================================= */

export const deleteCourse = async (
  req,
  res
) => {
  try {
    const { courseId } =
      req.params;

    const course =
      await Course.findByIdAndDelete(
        courseId
      );

    if (!course) {
      return res.status(404).json({
        success: false,
        message:
          "Course not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Course deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete course error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete course.",
    });
  }
};