import Test from "../models/Test.js";
import TestSession from "../models/TestSession.js";
import Enrollment from "../models/Enrollment.js";
import { calculateTestResult } from "../utils/testCalculator.js";
import TestResult from "../models/TestResult.js";

const getEnrolledCourse = async (
  userId,
  courseId
) => {
  return Enrollment.findOne({
    user: userId,
    course: courseId,
    status: {
      $in: ["active", "completed"],
    },
  });
};

export const getTestById = async (req, res) => {
  try {
    const { testId } = req.params;

    const test = await Test.findOne({
      _id: testId,
      published: true,
    }).lean();

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found.",
      });
    }

    const enrollment = await getEnrolledCourse(
      req.user._id,
      test.course
    );

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message:
          "You must be enrolled in this course.",
      });
    }

    return res.status(200).json({
      success: true,
      test: {
        id: test._id,
        course: test.course,
        lesson: test.lesson,
        title: test.title,
        type: test.type,
        content: test.content,
        audioUrl: test.audioUrl || null,
        baseWpm: test.baseWpm || 60,
        durationSeconds: test.durationSeconds,
        difficulty: test.difficulty,
      },
    });
  } catch (error) {
    console.error("Get test error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load test.",
    });
  }
};

export const startTest = async (req, res) => {
  try {
    const { testId } = req.params;

    // Student-chosen dictation speed / typing duration from the
    // "listening setup" screen. Both are optional and always clamped
    // server-side so a tampered request can't grant extra time.
    const { wpm, durationSeconds } = req.body || {};

    const test = await Test.findOne({
      _id: testId,
      published: true,
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found.",
      });
    }

    const enrollment = await getEnrolledCourse(
      req.user._id,
      test.course
    );

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message:
          "You must be enrolled in this course.",
      });
    }

    const activeSession =
      await TestSession.findOne({
        user: req.user._id,
        test: test._id,
        completionStatus: "in_progress",
      });

    if (activeSession) {
      return res.status(200).json({
        success: true,
        message: "Existing test session resumed.",
        session: {
          id: activeSession._id,
          startedAt: activeSession.startedAt,
          durationSeconds:
            activeSession.allottedSeconds ||
            activeSession.durationSeconds ||
            test.durationSeconds,
          selectedWpm:
            activeSession.selectedWpm || test.baseWpm,
          typedText: activeSession.typedText,
        },
      });
    }

    // Clamp the requested duration to (1s, test.durationSeconds].
    const requestedDuration = Number(durationSeconds);
    const allottedSeconds =
      Number.isFinite(requestedDuration) && requestedDuration > 0
        ? Math.min(requestedDuration, test.durationSeconds)
        : test.durationSeconds;

    const requestedWpm = Number(wpm);
    const selectedWpm =
      Number.isFinite(requestedWpm) && requestedWpm > 0
        ? requestedWpm
        : test.baseWpm;

    const session = await TestSession.create({
      user: req.user._id,
      course: test.course,
      test: test._id,
      type: test.type,
      sourceContent: test.content,
      startedAt: new Date(),
      allottedSeconds,
      selectedWpm,
      durationSeconds: 0,
      typedText: "",
      completionStatus: "in_progress",
    });

    return res.status(201).json({
      success: true,
      message: "Test started.",
      session: {
        id: session._id,
        startedAt: session.startedAt,
        durationSeconds: allottedSeconds,
        selectedWpm,
      },
    });
  } catch (error) {
    console.error("Start test error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to start test.",
    });
  }
};

export const submitTest = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { typedText = "" } = req.body;

    const session = await TestSession.findOne({
      _id: sessionId,
      user: req.user._id,
      completionStatus: "in_progress",
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Active test session not found.",
      });
    }

    const test = await Test.findById(session.test).lean();

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found.",
      });
    }

    const endedAt = new Date();

    const elapsedSeconds = Math.max(
      1,
      Math.round(
        (endedAt.getTime() -
          session.startedAt.getTime()) /
          1000
      )
    );

    // Cap elapsed time to whatever duration the student actually
    // chose at start (falls back to the test's max if that field
    // isn't set, e.g. for sessions created before this change).
    const allottedSeconds =
      session.allottedSeconds || test.durationSeconds;

    const actualDurationSeconds = Math.min(
      elapsedSeconds,
      allottedSeconds
    );

    const safeTypedText =
      typeof typedText === "string"
        ? typedText
        : "";

    const result = calculateTestResult({
      sourceText: session.sourceContent,
      typedText: safeTypedText,
      durationSeconds: actualDurationSeconds,
    });

    session.typedText = safeTypedText;

    session.endedAt = endedAt;

    session.durationSeconds =
      actualDurationSeconds;

    session.correctCharacters =
      result.correctCharacters;

    session.incorrectCharacters =
      result.incorrectCharacters;

    session.mistakes =
      result.mistakes;

    session.wpm =
      result.wpm;

    session.accuracy =
      result.accuracy;

    session.score =
      result.score;

    session.completionStatus =
      "completed";

    await session.save();

    // Store the completed result permanently
    // in MongoDB as a TestResult document.
    const testResult = await TestResult.create({
      user: req.user._id,
      course: session.course,
      test: session.test,
      session: session._id,
      typedText: session.typedText,
      durationSeconds: session.durationSeconds,
      correctCharacters:
        session.correctCharacters,
      incorrectCharacters:
        session.incorrectCharacters,
      mistakes: session.mistakes,
      wpm: session.wpm,
      accuracy: session.accuracy,
      score: session.score,
      completedAt: session.endedAt,
    });

    return res.status(200).json({
      success: true,
      message: "Test submitted successfully.",

      result: {
        id: testResult._id,
        sessionId: session._id,
        typedText: session.typedText,
        durationSeconds:
          session.durationSeconds,
        correctCharacters:
          session.correctCharacters,
        incorrectCharacters:
          session.incorrectCharacters,
        mistakes:
          session.mistakes,
        wpm:
          session.wpm,
        accuracy:
          session.accuracy,
        score:
          session.score,
        completionStatus:
          session.completionStatus,
      },
    });
  } catch (error) {
    console.error(
      "Submit test error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to calculate test result.",
    });
  }
};