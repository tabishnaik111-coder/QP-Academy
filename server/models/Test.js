import mongoose from "mongoose";

const testSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
      index: true,
    },

    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      default: null,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Test title is required"],
      trim: true,
      maxlength: [200, "Test title cannot exceed 200 characters"],
    },

    type: {
      type: String,
      enum: ["typing", "dictation"],
      required: true,
      index: true,
    },

    content: {
      type: String,
      required: [true, "Test content is required"],
      trim: true,
    },

    // Only used when type === "dictation". URL to the audio file the
    // student listens to before typing.
    audioUrl: {
      type: String,
      default: null,
      trim: true,
    },

    // The WPM the dictation audio was actually recorded/spoken at.
    // The frontend divides a student's chosen WPM by this to get the
    // audio's playbackRate (e.g. 95 / 60 = 1.58x).
    baseWpm: {
      type: Number,
      default: 60,
      min: [1, "baseWpm must be at least 1"],
    },

    durationSeconds: {
      type: Number,
      required: true,
      min: [1, "Test duration must be at least 1 second"],
    },

    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },

    published: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

testSchema.index({
  course: 1,
  published: 1,
});

const Test = mongoose.model("Test", testSchema);

export default Test;