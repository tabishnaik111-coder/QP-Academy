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