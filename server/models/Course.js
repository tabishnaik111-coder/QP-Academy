import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
      minlength: [3, "Course title must be at least 3 characters"],
      maxlength: [150, "Course title cannot exceed 150 characters"],
    },

    slug: {
      type: String,
      required: [true, "Course slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    shortDescription: {
      type: String,
      required: [true, "Short description is required"],
      trim: true,
      maxlength: [300, "Short description cannot exceed 300 characters"],
    },

    description: {
      type: String,
      required: [true, "Course description is required"],
      trim: true,
    },

    thumbnail: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: String,
      required: [true, "Course category is required"],
      trim: true,
      lowercase: true,
      index: true,
    },

    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
      index: true,
    },

    accessType: {
      type: String,
      enum: ["free", "paid"],
      default: "free",
      index: true,
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    instructor: {
      name: {
        type: String,
        trim: true,
        default: "QPA Academy",
      },

      bio: {
        type: String,
        trim: true,
        default: "",
      },

      image: {
        type: String,
        trim: true,
        default: "",
      },
    },

    modules: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Module",
      },
    ],

    published: {
      type: Boolean,
      default: false,
      index: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    featured: {
      type: Boolean,
      default: false,
      index: true,
    },

    enrollmentCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },

      count: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    totalLessons: {
      type: Number,
      default: 0,
      min: 0,
    },

    estimatedDuration: {
      type: Number,
      default: 0,
      min: 0,
    },

    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

courseSchema.index({
  title: "text",
  shortDescription: "text",
  description: "text",
});

const Course = mongoose.model("Course", courseSchema);

export default Course;