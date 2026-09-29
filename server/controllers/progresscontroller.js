import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Enrollment from "../models/Enrollment.js";
import Lesson from "../models/Lesson.js";
import Module from "../models/Module.js";
import Course from "../models/Course.js";
import LessonProgress from "../models/LessonProgress.js";
import DictationResult from "../models/DictationResult.js";

import { calculateTestResult } from "../utils/testCalculator.js";

const updateEnrollmentProgress = async (
  userId,
  courseId
) => {
  const enrollment = await Enrollment.findOne({
    user: userId,
    course: courseId,
  });

  if (!enrollment) {
    return;
  }

  // Module.js does not have a published field.
  const modules = await Module.find({
    course: courseId,
    published: { $ne: false },
  }).select("_id");

  const moduleIds = modules.map(
    (module) => module._id
  );

  // Lesson.js does not have a published field.
  const lessons = await Lesson.find({
    module: {
      $in: moduleIds,
    },
    published: { $ne: false },
  }).select("_id");

  const totalLessons = lessons.length;

  if (totalLessons === 0) {
    enrollment.progressPercentage = 0;
    await enrollment.save();
    return;
  }

  const lessonIds = lessons.map(
    (lesson) => lesson._id
  );

  const completedLessons =
    await LessonProgress.countDocuments({
      user: userId,
      course: courseId,
      lesson: {
        $in: lessonIds,
      },
      completed: true,
    });

  const progressPercentage = Math.round(
    (completedLessons / totalLessons) * 100
  );

  enrollment.progressPercentage =
    progressPercentage;

  if (progressPercentage === 100) {
    enrollment.status = "completed";
    enrollment.completedAt =
      enrollment.completedAt || new Date();
  } else if (enrollment.status === "completed") {
    enrollment.status = "active";
    enrollment.completedAt = null;
  }

  await enrollment.save();
};

export const getCourseProgress = async (
  req,
  res
) => {
  try {
    const { courseId } = req.params;

    const enrollment =
      await Enrollment.findOne({
        user: req.user._id,
        course: courseId,
      });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message:
          "You must be enrolled in this course.",
      });
    }

    // Modules are connected through Module.course.
    const modules = await Module.find({
      course: courseId,
      published: { $ne: false },
    })
      .sort({
        order: 1,
      })
      .lean();

    const moduleIds = modules.map(
      (module) => module._id
    );

    /*
     * Lessons are connected through Lesson.module.
     *
     * `transcript` is selected here ONLY so its word count can be
     * computed below. The raw transcript text is stripped back out
     * before the response is sent — the browser must never receive
     * the authoritative dictation transcript, only how many words
     * it contains (needed for the typing word-cap / "Words Left"
     * counter on the frontend).
     */
    const lessons = await Lesson.find({
      module: {
        $in: moduleIds,
      },
      published: { $ne: false },
    })
      .select(
        "module title description type content audioUrl duration wpm order transcript"
      )
      .sort({
        order: 1,
      })
      .lean();

    const progress =
      await LessonProgress.find({
        user: req.user._id,
        course: courseId,
      }).lean();

    const progressMap = new Map(
      progress.map((item) => [
        item.lesson.toString(),
        item,
      ])
    );

    const courseProgress = modules.map(
      (module) => {
        const moduleLessons =
          lessons.filter(
            (lesson) =>
              lesson.module.toString() ===
              module._id.toString()
          );

        return {
          ...module,

          lessons: moduleLessons.map(
            (lesson) => {
              const {
                transcript,
                ...safeLesson
              } = lesson;

              const transcriptWordCount =
                lesson.type === "dictation" &&
                typeof transcript === "string" &&
                transcript.trim()
                  ? transcript
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean).length
                  : undefined;

              return {
                ...safeLesson,

                transcriptWordCount,

                progress:
                  progressMap.get(
                    lesson._id.toString()
                  ) || {
                    completed: false,
                    progressPercentage: 0,
                  },
              };
            }
          ),
        };
      }
    );

    return res.status(200).json({
      success: true,

      enrollment: {
        status: enrollment.status,

        progressPercentage:
          enrollment.progressPercentage,
      },

      modules: courseProgress,
    });
  } catch (error) {
    console.error(
      "Get course progress error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load course progress.",
    });
  }
};

export const updateLessonProgress = async (
  req,
  res
) => {
  try {
    const { lessonId } = req.params;

    const {
      progressPercentage = 0,
      completed = false,
    } = req.body;

    const lesson = await Lesson.findOne({
      _id: lessonId,
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found.",
      });
    }

    const module = await Module.findOne({
      _id: lesson.module,
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module not found.",
      });
    }

    const course = await Course.findOne({
      _id: module.course,
      published: true,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const enrollment =
      await Enrollment.findOne({
        user: req.user._id,
        course: course._id,
        status: {
          $in: [
            "active",
            "completed",
          ],
        },
      });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message:
          "You must be enrolled in this course.",
      });
    }

    const safeProgress = Math.min(
      100,
      Math.max(
        0,
        Number(progressPercentage) || 0
      )
    );

    const isCompleted =
      completed === true ||
      safeProgress >= 100;

    const progress =
      await LessonProgress.findOneAndUpdate(
        {
          user: req.user._id,
          lesson: lesson._id,
        },
        {
          course: course._id,
          progressPercentage: isCompleted
            ? 100
            : safeProgress,
          completed: isCompleted,
          completedAt: isCompleted
            ? new Date()
            : null,
          lastAccessedAt: new Date(),
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

    await updateEnrollmentProgress(
      req.user._id,
      course._id
    );

    const updatedEnrollment =
      await Enrollment.findOne({
        user: req.user._id,
        course: course._id,
      }).lean();

    return res.status(200).json({
      success: true,

      message: isCompleted
        ? "Lesson completed."
        : "Lesson progress updated.",

      progress,

      courseProgress:
        updatedEnrollment?.progressPercentage ||
        0,
    });
  } catch (error) {
    console.error(
      "Update lesson progress error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update lesson progress.",
    });
  }
};

/*
 * =========================================
 * SUBMIT DICTATION
 * =========================================
 *
 * The authoritative transcript remains
 * inside MongoDB.
 *
 * The browser only sends the student's
 * typed text and duration.
 *
 * The result is:
 * 1. Calculated on the server
 * 2. Saved to DictationResult
 * 3. Saved to LessonProgress
 * 4. Included in the response
 */

export const submitDictation = async (
  req,
  res
) => {
  try {
    const { lessonId } = req.params;

    const {
      typedText = "",
      durationSeconds = 1,
    } = req.body;

    if (
      typeof typedText !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Typed text must be a string.",
      });
    }

    const lesson = await Lesson.findOne({
      _id: lessonId,
      type: "dictation",
    }).lean();

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message:
          "Published dictation lesson not found.",
      });
    }

    const module = await Module.findOne({
      _id: lesson.module,
    }).lean();

    if (!module) {
      return res.status(404).json({
        success: false,
        message:
          "Published module not found.",
      });
    }

    const course = await Course.findOne({
      _id: module.course,
      published: true,
    }).lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message:
          "Published course not found.",
      });
    }

    const enrollment =
      await Enrollment.findOne({
        user: req.user._id,
        course: course._id,
        status: {
          $in: [
            "active",
            "completed",
          ],
        },
      }).lean();

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message:
          "You must be enrolled in this course.",
      });
    }

    const transcript =
      typeof lesson.transcript === "string"
        ? lesson.transcript.trim()
        : "";

    if (!transcript) {
      return res.status(422).json({
        success: false,
        message:
          "This dictation does not have an authoritative transcript.",
      });
    }

    if (!typedText.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Please type the dictation before submitting.",
      });
    }

    const numericDuration =
      Number(durationSeconds);

    /*
     * Lesson.duration is entered in MINUTES in the admin
     * panel, but typing time is measured in seconds.
     * Convert it, otherwise a 5-minute lesson would cap
     * the typing time at 5 seconds and inflate the WPM.
     */

    const MAX_TYPING_SECONDS = 60 * 60; // keep in sync with ABSOLUTE_MAX_MINUTES on the frontend

const safeDuration = Math.min(
  MAX_TYPING_SECONDS,
  Math.max(
    1,
    Number.isFinite(numericDuration) ? Math.round(numericDuration) : 1
  )
);

    const result =
      calculateTestResult({
        sourceText: transcript,
        typedText,
        durationSeconds:
          safeDuration,
      });

    /*
     * Save the complete dictation result.
     *
     * Every submission is stored as a separate
     * attempt, allowing future performance
     * history and leaderboard functionality.
     */

    const savedResult =
      await DictationResult.create({
        user: req.user._id,
        course: course._id,
        lesson: lesson._id,

        typedText,

        durationSeconds:
          safeDuration,

        wpm:
          result.wpm,

        accuracy:
          result.accuracy,

        score:
          result.score,

        correctCharacters:
          result.correctCharacters,

        incorrectCharacters:
          result.incorrectCharacters,

        mistakes:
          result.mistakes,

        totalWords:
          result.totalWords,

        correctWords:
          result.correctWords,

        halfMistakeWords:
          result.halfMistakeWords,

        fullMistakeWords:
          result.fullMistakeWords,

        missingWords:
          result.missingWords,

        extraWords:
          result.extraWords,

        wordResults:
          result.wordResults,

        completedAt:
          new Date(),
      });

    /*
     * Completing a dictation means the
     * corresponding lesson has been completed.
     *
     * This uses the existing LessonProgress
     * system instead of creating another
     * progress mechanism.
     */

    const lessonProgress =
      await LessonProgress.findOneAndUpdate(
        {
          user: req.user._id,
          lesson: lesson._id,
        },
        {
          course: course._id,
          progressPercentage: 100,
          completed: true,
          completedAt: new Date(),
          lastAccessedAt: new Date(),
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

    /*
     * Recalculate the complete course
     * progress after this lesson is completed.
     */

    await updateEnrollmentProgress(
      req.user._id,
      course._id
    );

    const updatedEnrollment =
      await Enrollment.findOne({
        user: req.user._id,
        course: course._id,
      }).lean();

    return res.status(200).json({
      success: true,

      message:
        "Dictation submitted and saved successfully.",

      result: {
        id:
          savedResult._id,

        correctCharacters:
          result.correctCharacters,

        incorrectCharacters:
          result.incorrectCharacters,

        mistakes:
          result.mistakes,

        wpm:
          result.wpm,

        accuracy:
          result.accuracy,

        score:
          result.score,

        sourceWords:
          result.sourceWords,

        typedWords:
          result.typedWords,

        wordResults:
          result.wordResults,

        extraWords:
          result.extraWords,

        totalWords:
          result.totalWords,

        typedWordCount:
          result.typedWordCount,

        correctWords:
          result.correctWords,

        halfMistakeWords:
          result.halfMistakeWords,

        fullMistakeWords:
          result.fullMistakeWords,

        missingWords:
          result.missingWords,

        correctWordResults:
          result.correctWordResults,

        halfMistakeWordResults:
          result.halfMistakeWordResults,

        fullMistakeWordResults:
          result.fullMistakeWordResults,

        missingWordResults:
          result.missingWordResults,

        mistakesByType:
          result.mistakesByType,

        durationSeconds:
          safeDuration,

        completedAt:
          savedResult.completedAt,
      },

      progress: {
        lesson: lessonProgress,

        courseProgress:
          updatedEnrollment?.progressPercentage ||
          0,

        enrollmentStatus:
          updatedEnrollment?.status ||
          enrollment.status,
      },
    });
  } catch (error) {
    console.error(
      "Submit dictation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to save dictation result.",
    });
  }
};

/*
 * =========================================
 * GET LATEST DICTATION RESULT
 * =========================================
 *
 * Used when the student returns to a
 * dictation lesson or refreshes the page.
 *
 * The latest saved attempt is returned.
 */

export const getLatestDictationResult = async (
  req,
  res
) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findOne({
      _id: lessonId,
      type: "dictation",
    }).lean();

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message:
          "Published dictation lesson not found.",
      });
    }

    const module = await Module.findOne({
      _id: lesson.module,
    }).lean();

    if (!module) {
      return res.status(404).json({
        success: false,
        message:
          "Published module not found.",
      });
    }

    const enrollment =
      await Enrollment.findOne({
        user: req.user._id,
        course: module.course,
        status: {
          $in: [
            "active",
            "completed",
          ],
        },
      }).lean();

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message:
          "You must be enrolled in this course.",
      });
    }

    const result =
      await DictationResult.findOne({
        user: req.user._id,
        lesson: lesson._id,
      })
        .sort({
          completedAt: -1,
        })
        .lean();

    if (!result) {
      return res.status(200).json({
        success: true,
        hasResult: false,
        result: null,
      });
    }

    return res.status(200).json({
      success: true,
      hasResult: true,
      result,
    });
  } catch (error) {
    console.error(
      "Get latest dictation result error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load dictation result.",
    });
  }
};

/*
 * =========================================
 * STREAM DICTATION AUDIO
 * =========================================
 *
 * Audio files are stored on the backend:
 *
 * server/
 * └── uploads/
 *     └── dictations/
 *
 * The browser does not receive a public
 * filesystem URL.
 *
 * Access is checked through:
 * 1. Authentication
 * 2. Published lesson
 * 3. Published module
 * 4. Published course
 * 5. Active/completed enrollment
 *
 * This prevents unauthorized users from
 * directly accessing paid dictation audio.
 */

export const streamDictationAudio = async (
  req,
  res
) => {
  try {
    const { lessonId } = req.params;

    /*
     * Lesson.js currently does NOT have a
     * published field, so do not filter by
     * published here.
     */
    const lesson = await Lesson.findOne({
      _id: lessonId,
      type: "dictation",
    }).lean();

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message:
          "Dictation lesson not found.",
      });
    }

    /*
     * Module.js currently does NOT have a
     * published field either.
     */
    const module = await Module.findOne({
      _id: lesson.module,
    }).lean();

    if (!module) {
      return res.status(404).json({
        success: false,
        message:
          "Module not found.",
      });
    }

    /*
     * Course DOES have publishing support,
     * so keep the published check here.
     */
    const course = await Course.findOne({
      _id: module.course,
      published: true,
    }).lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message:
          "Published course not found.",
      });
    }

    /*
     * Only enrolled students can access
     * the protected audio stream.
     */
    const enrollment =
      await Enrollment.findOne({
        user: req.user._id,
        course: course._id,
        status: {
          $in: [
            "active",
            "completed",
          ],
        },
      }).lean();

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message:
          "You must be enrolled in this course.",
      });
    }

    /*
     * The admin should store only the audio
     * filename in Lesson.audioUrl.
     *
     * Example:
     * dictation-001.mp3
     */
    if (
      typeof lesson.audioUrl !== "string" ||
      !lesson.audioUrl.trim()
    ) {
      return res.status(404).json({
        success: false,
        message:
          "No audio file is configured for this dictation.",
      });
    }

    const audioFileName =
      path.basename(
        lesson.audioUrl
          .trim()
          .replace(/\\/g, "/")
      );

    if (
      !audioFileName ||
      audioFileName === "." ||
      audioFileName === ".."
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Invalid dictation audio file.",
      });
    }

    /*
     * Resolve:
     *
     * server/controllers/progresscontroller.js
     *
     * -> ../uploads/dictations
     *
     * Result:
     *
     * server/uploads/dictations/dictation-001.mp3
     */
    const __filename =
      fileURLToPath(import.meta.url);

    const __dirname =
      path.dirname(__filename);

    const uploadsDirectory =
      path.resolve(
        __dirname,
        "../uploads/dictations"
      );

    const audioPath =
      path.resolve(
        uploadsDirectory,
        audioFileName
      );

    /*
     * Security check:
     * Make sure the requested file cannot
     * escape the dictations directory.
     */
    if (
      !audioPath.startsWith(
        `${uploadsDirectory}${path.sep}`
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid audio file path.",
      });
    }

    /*
     * Check whether the actual audio file
     * exists on the server.
     */
    if (
      !fs.existsSync(audioPath)
    ) {
      console.error(
        "Dictation audio file not found:",
        audioPath
      );

      return res.status(404).json({
        success: false,
        message:
          "Dictation audio file not found on the server.",
      });
    }

    /*
     * Determine the correct MIME type.
     */
    const extension =
      path.extname(
        audioFileName
      ).toLowerCase();

    const mimeTypes = {
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".ogg": "audio/ogg",
      ".m4a": "audio/mp4",
      ".aac": "audio/aac",
      ".webm": "audio/webm",
    };

    const contentType =
      mimeTypes[extension] ||
      "application/octet-stream";

    res.setHeader(
      "Content-Type",
      contentType
    );

    res.setHeader(
      "Content-Disposition",
      "inline"
    );

    res.setHeader(
      "Cache-Control",
      "private, no-store"
    );

    res.setHeader(
      "X-Content-Type-Options",
      "nosniff"
    );

    /*
     * Get file information.
     */
    const stat =
      fs.statSync(audioPath);

    const fileSize = stat.size;

    /*
     * Browsers commonly use Range requests
     * when playing/seeking audio.
     */
    const range =
      req.headers.range;

    /*
     * Normal full-file request.
     */
    if (!range) {
      res.setHeader(
        "Content-Length",
        fileSize
      );

      res.setHeader(
        "Accept-Ranges",
        "bytes"
      );

      return fs
        .createReadStream(audioPath)
        .pipe(res);
    }

    /*
     * Parse browser Range header.
     *
     * Example:
     * bytes=0-999999
     */
    const parts =
      range
        .replace(
          /bytes=/,
          ""
        )
        .split("-");

    const start =
      parseInt(
        parts[0],
        10
      );

    const end =
      parts[1]
        ? parseInt(
            parts[1],
            10
          )
        : fileSize - 1;

    /*
     * Validate requested range.
     */
    if (
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      start < 0 ||
      end >= fileSize ||
      start > end
    ) {
      res.status(416);

      res.setHeader(
        "Content-Range",
        `bytes */${fileSize}`
      );

      return res.end();
    }

    const chunkSize =
      end - start + 1;

    res.status(206);

    res.setHeader(
      "Accept-Ranges",
      "bytes"
    );

    res.setHeader(
      "Content-Range",
      `bytes ${start}-${end}/${fileSize}`
    );

    res.setHeader(
      "Content-Length",
      chunkSize
    );

    return fs
      .createReadStream(
        audioPath,
        {
          start,
          end,
        }
      )
      .pipe(res);
  } catch (error) {
    console.error(
      "Stream dictation audio error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load dictation audio.",
    });
  }
};