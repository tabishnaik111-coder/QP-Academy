import mongoose from "mongoose";

const wordResultSchema = new mongoose.Schema(
  {
    sourceWord: {
      type: String,
      default: "",
      trim: true,
    },

    typedWord: {
      type: String,
      default: "",
      trim: true,
    },

    classification: {
      type: String,
      enum: ["correct", "half", "full", "missing", "extra"],
      required: true,
    },

    similarity: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
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
  },
  {
    _id: false,
  }
);

const dictationResultSchema = new mongoose.Schema(
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

    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
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

    totalWords: {
      type: Number,
      default: 0,
      min: 0,
    },

    correctWords: {
      type: Number,
      default: 0,
      min: 0,
    },

    halfMistakeWords: {
      type: Number,
      default: 0,
      min: 0,
    },

    fullMistakeWords: {
      type: Number,
      default: 0,
      min: 0,
    },

    missingWords: {
      type: Number,
      default: 0,
      min: 0,
    },

extraWords: {
  type: [
    {
      index: { type: Number, default: 0 },
      expected: { type: String, default: "" },
      typed: { type: String, default: "" },
      classification: {
        type: String,
        enum: ["correct", "half", "full", "missing", "extra"],
        default: "extra",
      },
      similarity: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },
  ],
  default: [],
},

    wordResults: {
      type: [wordResultSchema],
      default: [],
    },

    completedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

dictationResultSchema.index({
  user: 1,
  course: 1,
  completedAt: -1,
});

dictationResultSchema.index({
  lesson: 1,
  score: -1,
});

dictationResultSchema.index({
  user: 1,
  lesson: 1,
  completedAt: -1,
});

const DictationResult = mongoose.model(
  "DictationResult",
  dictationResultSchema
);

export default DictationResult;