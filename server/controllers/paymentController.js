import mongoose from "mongoose";

import Course from "../models/Course.js";
import Purchase from "../models/Purchase.js";
import Enrollment from "../models/Enrollment.js";

import {
  createPaymentOrder as createProviderOrder,
  verifyPaymentSignature,
  fetchPaymentOrder,
  fetchPayment,
} from "../services/paymentService.js";

/*
 * =========================================
 * HELPER: GIVE THE STUDENT ACCESS
 *
 * Creates the Enrollment for a paid course so
 * the course shows on the dashboard, the learning
 * page and the test routes. Safe to call twice.
 * =========================================
 */

const grantCourseEnrollment = async (user, courseId) => {
  const existing = await Enrollment.findOne({
    user: user._id,
    course: courseId,
  });

  if (existing) {
    // Re-activate if it was cancelled, otherwise leave it alone
    if (existing.status === "cancelled") {
      existing.status = "active";
      await existing.save();
    }

    return existing;
  }

  try {
    const enrollment = await Enrollment.create({
      user: user._id,
      course: courseId,
      accessType: "paid",
      status: "active",
    });

    await Course.findByIdAndUpdate(courseId, {
      $inc: { enrollmentCount: 1 },
    });

    await user.updateOne({
      $addToSet: { enrolledCourses: courseId },
    });

    return enrollment;
  } catch (error) {
    // Two requests at the same moment: the other one won
    if (error.code === 11000) {
      return Enrollment.findOne({
        user: user._id,
        course: courseId,
      });
    }

    throw error;
  }
};

/*
 * =========================================
 * CREATE PAYMENT ORDER
 * =========================================
 */

export const createPaymentOrder = async (req, res) => {
  try {
    const { courseId } = req.body;

    if (
      !courseId ||
      !mongoose.Types.ObjectId.isValid(courseId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid course ID is required.",
      });
    }

    const course = await Course.findOne({
      _id: courseId,
      published: true,
    }).lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Published course not found.",
      });
    }

    if (!course.price || Number(course.price) <= 0) {
      return res.status(400).json({
        success: false,
        message: "This course does not require payment.",
      });
    }

    const order = await createProviderOrder({
      amount: Number(course.price),
      currency: "INR",
      receipt:
        "rcpt_" +
        Date.now() +
        "_" +
        String(course._id).slice(-6),
      notes: {
        userId: req.user._id.toString(),
        courseId: course._id.toString(),
      },
    });

    return res.status(201).json({
      success: true,

      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },

      course: {
        id: course._id,
        title: course.title,
        price: course.price,
      },

      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create payment order error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create payment order.",
    });
  }
};

/*
 * =========================================
 * VERIFY PAYMENT
 * =========================================
 */

export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment verification information is incomplete.",
      });
    }

    // STEP 1: verify the payment signature
    const isSignatureValid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature.",
      });
    }

    // STEP 2: fetch the order from Razorpay
    const order = await fetchPaymentOrder(
      razorpay_order_id
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Payment order not found.",
      });
    }

    // STEP 3: the order must belong to this user
    const orderUserId = order.notes?.userId;

    if (
      !orderUserId ||
      orderUserId !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "This payment order does not belong to the current user.",
      });
    }

    // STEP 4: get the course from trusted order data
    const courseId = order.notes?.courseId;

    if (
      !courseId ||
      !mongoose.Types.ObjectId.isValid(courseId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment course information is invalid.",
      });
    }

    const course = await Course.findOne({
      _id: courseId,
      published: true,
    }).lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Purchased course not found.",
      });
    }

    // STEP 5: the amount paid must match the course price
    const expectedAmount = Math.round(
      Number(course.price) * 100
    );

    if (Number(order.amount) !== expectedAmount) {
      return res.status(400).json({
        success: false,
        message:
          "Payment amount does not match the course price.",
      });
    }

    // STEP 6: already recorded? Make sure access exists, then return
    const existingPurchase = await Purchase.findOne({
      orderId: razorpay_order_id,
    });

    if (existingPurchase) {
      await grantCourseEnrollment(req.user, course._id);

      return res.status(200).json({
        success: true,
        message: "Payment was already verified.",
        purchase: {
          id: existingPurchase._id,
          courseId: existingPurchase.course,
          orderId: existingPurchase.orderId,
          paymentId: existingPurchase.paymentId,
          amount: existingPurchase.amount,
          currency: existingPurchase.currency,
          status: existingPurchase.status,
        },
      });
    }

    // STEP 7: check the real payment
    const payment = await fetchPayment(razorpay_payment_id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    if (payment.orderId !== razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: "Payment does not belong to this order.",
      });
    }

    if (payment.status !== "captured") {
      return res.status(400).json({
        success: false,
        message: "Payment has not been captured.",
      });
    }

    // STEP 8: save the purchase
    const purchase = await Purchase.create({
      user: req.user._id,
      course: course._id,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      amount: Number(order.amount) / 100,
      currency: order.currency || "INR",
      status: "paid",
      purchasedAt: new Date(),
    });

    // STEP 9: enroll the student so the course unlocks
    await grantCourseEnrollment(req.user, course._id);

    return res.status(200).json({
      success: true,

      message:
        "Payment verified and purchase recorded successfully.",

      purchase: {
        id: purchase._id,
        courseId: purchase.course,
        orderId: purchase.orderId,
        paymentId: purchase.paymentId,
        amount: purchase.amount,
        currency: purchase.currency,
        status: purchase.status,
      },
    });
  } catch (error) {
    console.error("Payment verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify and record payment.",
    });
  }
};

/*
 * =========================================
 * CHECK COURSE ACCESS
 *
 * Used by the course page after a refresh.
 * Access = a paid purchase OR an active/completed
 * enrollment.
 * =========================================
 */

export const checkCourseAccess = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        hasAccess: false,
        message: "Invalid course ID.",
      });
    }

    const [purchase, enrollment] = await Promise.all([
      Purchase.findOne({
        user: req.user._id,
        course: courseId,
        status: "paid",
      }).lean(),

      Enrollment.findOne({
        user: req.user._id,
        course: courseId,
        status: { $in: ["active", "completed"] },
      }).lean(),
    ]);

    return res.status(200).json({
      success: true,
      hasAccess: Boolean(purchase || enrollment),
    });
  } catch (error) {
    console.error("Check course access error:", error);

    return res.status(500).json({
      success: false,
      hasAccess: false,
      message: "Unable to check course access.",
    });
  }
};