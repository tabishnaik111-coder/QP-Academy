import mongoose from "mongoose";

const testSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["typing", "dictation"],
      required: true,
    },

    sourceContent: {
      type: String,
      required: true,
    },

    startedAt: {
      type: Date,
      required: true,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    // The student's chosen typing duration from the listening-setup
    // screen (clamped server-side to Test.durationSeconds). Used by
    // submitTest to cap elapsed time instead of always allowing the
    // test's full max duration.
    allottedSeconds: {
      type: Number,
      default: null,
      min: 0,
    },

    // The dictation playback speed (WPM) the student selected before
    // starting, kept for the record / leaderboard context.
    selectedWpm: {
      type: Number,
      default: null,
      min: 0,
    },

    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    typedText: {
      type: String,
      default: "",
    },

    correctCharacters: {
      type: Number,
      default: 0,
      min: 0,
    },

    incorrectCharacters: {
      type: Number,
      default: 0,
      min: 0,
    },

    mistakes: {
      type: Number,
      default: 0,
      min: 0,
    },

    wpm: {
      type: Number,
      default: 0,
      min: 0,
    },

    accuracy: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    score: {
      type: Number,
      default: 0,
      min: 0,
    },

    completionStatus: {
      type: String,
      enum: ["in_progress", "completed", "abandoned"],
      default: "in_progress",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

testSessionSchema.index({
  user: 1,
  course: 1,
  createdAt: -1,
});

const TestSession = mongoose.model(
  "TestSession",
  testSessionSchema
);

export default TestSession;