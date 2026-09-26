import mongoose from "mongoose";

const testResultSchema = new mongoose.Schema(
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

    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestSession",
      required: true,
      unique: true,
      index: true,
    },

    typedText: {
      type: String,
      default: "",
    },

    durationSeconds: {
      type: Number,
      required: true,
      min: 0,
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

    completedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

testResultSchema.index({
  user: 1,
  course: 1,
  completedAt: -1,
});

testResultSchema.index({
  test: 1,
  score: -1,
});

const TestResult = mongoose.model(
  "TestResult",
  testResultSchema
);

export default TestResult;