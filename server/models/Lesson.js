import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "lesson",
        "video",
        "dictation",
        "test",
      ],
      default: "lesson",
    },

    content: {
      type: String,
      default: "",
    },

    /*
     * =========================================
     * DICTATION TRANSCRIPT
     * =========================================
     *
     * This is the authoritative text used
     * when checking a student's dictation.
     */

    transcript: {
      type: String,
      default: "",
      trim: true,
    },

    audioUrl: {
      type: String,
      default: "",
      trim: true,
    },

    /*
     * =========================================
     * DICTATION RECORDING SPEED
     * =========================================
     *
     * Only meaningful when type === "dictation".
     * The words-per-minute the audioUrl file was
     * actually recorded/spoken at. The frontend
     * divides a student's chosen WPM by this to
     * set the audio's playbackRate (e.g. choosing
     * 95 WPM on a lesson recorded at 60 WPM plays
     * back at 95 / 60 = 1.58x).
     */

    wpm: {
      type: Number,
      default: 60,
      min: [1, "wpm must be at least 1"],
    },

    duration: {
      type: Number,
      default: 0,
    },

    order: {
      type: Number,
      default: 0,
    },

    published: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

lessonSchema.index({
  module: 1,
  order: 1,
});

export default mongoose.model(
  "Lesson",
  lessonSchema
);