import Course from "../models/Course.js";
import Module from "../models/Module.js";
import Lesson from "../models/Lesson.js";

/*
 * =========================================
 * LESSON DURATION HELPERS
 *
 * Lesson.duration is stored as a plain number.
 * Set this to "seconds" if your admin panel
 * enters lesson durations in seconds.
 * =========================================
 */

const LESSON_DURATION_UNIT = "minutes";

const toMinutes = (value) => {
  const number = Number(value) || 0;

  return Math.round(
    LESSON_DURATION_UNIT === "seconds"
      ? number / 60
      : number
  );
};

/*
 * Real lesson count and total duration for
 * many courses at once (used by the course list).
 * Unpublished lessons and modules are ignored.
 */

const getLessonStatsByCourse = async (courseIds) => {
  if (!courseIds.length) {
    return new Map();
  }

  const rows = await Lesson.aggregate([
    {
      $match: {
        course: { $in: courseIds },
        published: { $ne: false },
      },
    },
    {
      $lookup: {
        from: Module.collection.name,
        localField: "module",
        foreignField: "_id",
        as: "moduleDoc",
      },
    },
    {
      $match: {
        "moduleDoc.0": { $exists: true },
        "moduleDoc.published": { $ne: false },
      },
    },
    {
      $group: {
        _id: "$course",
        totalLessons: { $sum: 1 },
        totalDuration: { $sum: "$duration" },
      },
    },
  ]);

  return new Map(
    rows.map((row) => [
      String(row._id),
      {
        totalLessons: row.totalLessons,
        estimatedDuration: toMinutes(row.totalDuration),
      },
    ])
  );
};

const createSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

const validateCourseData = (body) => {
  const errors = {};

  if (!body.title || !body.title.trim()) {
    errors.title = "Course title is required.";
  }

  if (
    !body.shortDescription ||
    !body.shortDescription.trim()
  ) {
    errors.shortDescription =
      "Short description is required.";
  }

  if (
    !body.description ||
    !body.description.trim()
  ) {
    errors.description =
      "Course description is required.";
  }

  if (!body.category || !body.category.trim()) {
    errors.category =
      "Course category is required.";
  }

  if (
    body.difficulty &&
    ![
      "beginner",
      "intermediate",
      "advanced",
    ].includes(body.difficulty)
  ) {
    errors.difficulty = "Invalid difficulty.";
  }

  if (
    body.accessType &&
    !["free", "paid"].includes(body.accessType)
  ) {
    errors.accessType = "Invalid access type.";
  }

  const accessType =
    body.accessType || "free";

  const price = Number(
    body.price ?? 0
  );

  if (
    Number.isNaN(price) ||
    price < 0
  ) {
    errors.price =
      "Price must be a valid non-negative number.";
  }

  if (
    accessType === "free" &&
    price !== 0
  ) {
    errors.price =
      "Free courses must have a price of 0.";
  }

  if (
    accessType === "paid" &&
    price <= 0
  ) {
    errors.price =
      "Paid courses must have a price greater than 0.";
  }

  return errors;
};

const buildCoursePayload = (body) => {
  const accessType =
    body.accessType || "free";

  return {
    title: body.title.trim(),

    slug: body.slug
      ? body.slug.trim().toLowerCase()
      : createSlug(body.title),

    shortDescription:
      body.shortDescription.trim(),

    description:
      body.description.trim(),

    thumbnail:
      body.thumbnail?.trim() || "",

    category:
      body.category.trim().toLowerCase(),

    difficulty:
      body.difficulty || "beginner",

    accessType,

    price:
      accessType === "free"
        ? 0
        : Number(body.price || 0),

    currency:
      body.currency?.trim().toUpperCase() ||
      "INR",

    instructor: {
      name:
        body.instructor?.name?.trim() ||
        "QPA Academy",

      bio:
        body.instructor?.bio?.trim() || "",

      image:
        body.instructor?.image?.trim() || "",
    },

    featured:
      Boolean(body.featured),

    tags:
      Array.isArray(body.tags)
        ? body.tags
            .map((tag) =>
              String(tag)
                .trim()
                .toLowerCase()
            )
            .filter(Boolean)
        : [],
  };
};

/* =========================================
   GET PUBLISHED COURSES
========================================= */

export const getPublishedCourses = async (
  req,
  res
) => {
  try {
    const courses =
      await Course.find({
        published: true,
      })
        .select(
          "title slug shortDescription thumbnail category difficulty accessType price currency instructor.name featured enrollmentCount rating totalLessons estimatedDuration tags"
        )
        .sort({
          featured: -1,
          createdAt: -1,
        })
        .lean();

    const statsByCourse = await getLessonStatsByCourse(
      courses.map((course) => course._id)
    );

    const coursesWithStats = courses.map((course) => ({
      ...course,
      totalLessons:
        statsByCourse.get(String(course._id))?.totalLessons ?? 0,
      estimatedDuration:
        statsByCourse.get(String(course._id))?.estimatedDuration ?? 0,
    }));

    return res.status(200).json({
      success: true,
      count: coursesWithStats.length,
      courses: coursesWithStats,
    });
  } catch (error) {
    console.error(
      "Get published courses error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load courses.",
    });
  }
};

/* =========================================
   GET COURSE BY SLUG
========================================= */

export const getCourseBySlug = async (
  req,
  res
) => {
  try {
    const { slug } = req.params;

    /*
     * First find the published course.
     */

    const course =
      await Course.findOne({
        slug: slug.toLowerCase(),
        published: true,
      }).lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message:
          "Course not found.",
      });
    }

    /*
     * IMPORTANT:
     *
     * Modules are related to the course
     * through Module.course.
     *
     * We therefore query Module directly
     * instead of relying on Course.modules.
     */

    const moduleDocuments =
      await Module.find({
        course: course._id,
      })
        .sort({
          order: 1,
          createdAt: 1,
        })
        .lean();

    /*
     * Load lessons for every module.
     *
     * Lessons are related through
     * Lesson.module.
     */

    const modules = await Promise.all(
      moduleDocuments.map(
        async (module) => {
          const lessons =
            await Lesson.find({
              module: module._id,
            })
              .sort({
                order: 1,
                createdAt: 1,
              })
              .select(
                "title description type duration published order"
              )
              .lean();

          return {
            ...module,

            /*
             * Existing modules created before
             * published was added are treated
             * as published.
             */
            published:
              module.published !== false,

            lessons: lessons
              .filter(
                (lesson) =>
                  lesson.published !== false
              )
              .map((lesson) => ({
                ...lesson,
                published: true,
              })),
          };
        }
      )
    );

    /*
     * Only explicitly unpublished modules
     * are hidden.
     */
    const publishedModules =
      modules.filter(
        (module) =>
          module.published !== false
      );

    /*
     * Attach the actual modules and lessons
     * to the course response.
     */

    course.modules =
      publishedModules;

    /*
     * Real totals, calculated from the lessons
     * that students can actually see.
     */

    const visibleLessons = publishedModules.flatMap(
      (module) => module.lessons
    );

    course.totalLessons = visibleLessons.length;

    course.estimatedDuration = toMinutes(
      visibleLessons.reduce(
        (sum, lesson) =>
          sum + (Number(lesson.duration) || 0),
        0
      )
    );

    return res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    console.error(
      "Get course by slug error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load course.",
    });
  }
};

/* =========================================
   CREATE COURSE
========================================= */

export const createCourse = async (
  req,
  res
) => {
  try {
    const errors =
      validateCourseData(req.body);

    if (
      Object.keys(errors).length > 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please correct the course information.",
        errors,
      });
    }

    const payload =
      buildCoursePayload(req.body);

    const existingCourse =
      await Course.findOne({
        slug: payload.slug,
      });

    if (existingCourse) {
      return res.status(409).json({
        success: false,
        message:
          "A course with this slug already exists.",
      });
    }

    const course =
      await Course.create(payload);

    return res.status(201).json({
      success: true,
      message:
        "Course created successfully.",
      course,
    });
  } catch (error) {
    console.error(
      "Create course error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A course with this slug already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to create course.",
    });
  }
};

/* =========================================
   UPDATE COURSE
========================================= */

export const updateCourse = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const errors =
      validateCourseData(req.body);

    if (
      Object.keys(errors).length > 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please correct the course information.",
        errors,
      });
    }

    const payload =
      buildCoursePayload(req.body);

    const duplicateCourse =
      await Course.findOne({
        slug: payload.slug,
        _id: {
          $ne: id,
        },
      });

    if (duplicateCourse) {
      return res.status(409).json({
        success: false,
        message:
          "Another course already uses this slug.",
      });
    }

    const course =
      await Course.findByIdAndUpdate(
        id,
        payload,
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
   DELETE COURSE
========================================= */

export const deleteCourse = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const course =
      await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message:
          "Course not found.",
      });
    }

    await Course.findByIdAndDelete(id);

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