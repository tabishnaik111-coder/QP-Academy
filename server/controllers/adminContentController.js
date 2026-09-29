import Course from "../models/Course.js";
import Module from "../models/Module.js";
import Lesson from "../models/Lesson.js";

/*
 * Recorded speed of a dictation audio file, in words per minute.
 * Only meaningful for dictation lessons; everything else is stored
 * as the default (60). Always a whole number of at least 1.
 */
const sanitizeWpm = (type, wpm) => {
  if (type !== "dictation") {
    return 60;
  }

  const numeric = Math.round(Number(wpm));

  return Number.isFinite(numeric) && numeric >= 1
    ? numeric
    : 60;
};

/* =========================================
   MODULES
========================================= */

export const getAdminModules = async (
  req,
  res
) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(
      courseId
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const modules = await Module.find({
      course: courseId,
    })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      modules,
    });
  } catch (error) {
    console.error(
      "Admin modules error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load modules.",
    });
  }
};

export const createModule = async (
  req,
  res
) => {
  try {
    const { courseId } = req.params;

    const {
      title,
      description = "",
      order = 0,
      published = true,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Module title is required.",
      });
    }

    const course = await Course.findById(
      courseId
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const module = await Module.create({
      course: courseId,
      title: title.trim(),
      description: description.trim(),
      order: Number(order) || 0,
      published: Boolean(published),
    });

    return res.status(201).json({
      success: true,
      message: "Module created successfully.",
      module,
    });
  } catch (error) {
    console.error(
      "Create module error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to create module.",
    });
  }
};

export const updateModule = async (
  req,
  res
) => {
  try {
    const { moduleId } = req.params;

    const {
      title,
      description = "",
      order = 0,
      published = true,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Module title is required.",
      });
    }

    const module =
      await Module.findByIdAndUpdate(
        moduleId,
        {
          title: title.trim(),
          description: description.trim(),
          order: Number(order) || 0,
          published: Boolean(published),
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Module updated successfully.",
      module,
    });
  } catch (error) {
    console.error(
      "Update module error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to update module.",
    });
  }
};

export const deleteModule = async (
  req,
  res
) => {
  try {
    const { moduleId } = req.params;

    const module =
      await Module.findById(moduleId);

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module not found.",
      });
    }

    await Lesson.deleteMany({
      module: moduleId,
    });

    await Module.findByIdAndDelete(
      moduleId
    );

    return res.status(200).json({
      success: true,
      message:
        "Module and its lessons deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete module error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to delete module.",
    });
  }
};

/* =========================================
   LESSONS
========================================= */

export const getAdminLessons = async (
  req,
  res
) => {
  try {
    const { moduleId } = req.params;

    const module =
      await Module.findById(moduleId);

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module not found.",
      });
    }

    const lessons = await Lesson.find({
      module: moduleId,
    })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      lessons,
    });
  } catch (error) {
    console.error(
      "Admin lessons error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load lessons.",
    });
  }
};

export const createLesson = async (
  req,
  res
) => {
  try {
    const { moduleId } = req.params;

    const {
      title,
      description = "",
      type = "lesson",
      content = "",
      transcript = "",
      audioUrl = "",
      wpm = 60,
      duration = 0,
      order = 0,
      published = true,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Lesson title is required.",
      });
    }

    const module =
      await Module.findById(moduleId);

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module not found.",
      });
    }

    const safeTranscript =
      type === "dictation"
        ? String(transcript || "").trim()
        : "";

    const lesson = await Lesson.create({
      course: module.course,
      module: moduleId,
      title: title.trim(),
      description: description.trim(),
      type,
      content,
      transcript: safeTranscript,
      audioUrl: audioUrl.trim(),
      wpm: sanitizeWpm(type, wpm),
      duration:
        Number(duration) || 0,
      order: Number(order) || 0,
      published: Boolean(published),
    });

    return res.status(201).json({
      success: true,
      message: "Lesson created successfully.",
      lesson,
    });
  } catch (error) {
    console.error(
      "Create lesson error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to create lesson.",
    });
  }
};

export const updateLesson = async (
  req,
  res
) => {
  try {
    const { lessonId } = req.params;

    const {
      title,
      description = "",
      type = "lesson",
      content = "",
      transcript = "",
      audioUrl = "",
      wpm = 60,
      duration = 0,
      order = 0,
      published = true,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Lesson title is required.",
      });
    }

    const safeTranscript =
      type === "dictation"
        ? String(transcript || "").trim()
        : "";

    const lesson =
      await Lesson.findByIdAndUpdate(
        lessonId,
        {
          title: title.trim(),
          description: description.trim(),
          type,
          content,
          transcript: safeTranscript,
          audioUrl: audioUrl.trim(),
          wpm: sanitizeWpm(type, wpm),
          duration:
            Number(duration) || 0,
          order: Number(order) || 0,
          published: Boolean(published),
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lesson updated successfully.",
      lesson,
    });
  } catch (error) {
    console.error(
      "Update lesson error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to update lesson.",
    });
  }
};

export const deleteLesson = async (
  req,
  res
) => {
  try {
    const { lessonId } = req.params;

    const lesson =
      await Lesson.findByIdAndDelete(
        lessonId
      );

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lesson deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete lesson error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to delete lesson.",
    });
  }
};