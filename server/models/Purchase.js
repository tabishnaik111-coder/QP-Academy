import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema(
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

    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    paymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "paid",
        "failed",
        "refunded",
      ],
      default: "paid",
      index: true,
    },

    purchasedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

purchaseSchema.index({
  user: 1,
  course: 1,
});

const Purchase = mongoose.model(
  "Purchase",
  purchaseSchema
);

export default Purchase;