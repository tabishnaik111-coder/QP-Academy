import crypto from "crypto";

import getRazorpayClient from "../config/razorpay.js";

/*
 * =========================================
 * RAZORPAY PROVIDER
 * =========================================
 *
 * All Razorpay-specific implementation stays
 * inside this provider.
 *
 * The rest of the application should use the
 * generic payment service below.
 */

const razorpayProvider = {
  name: "razorpay",

  async createOrder({
    amount,
    currency = "INR",
    receipt,
    notes = {},
  }) {
    const razorpay =
      getRazorpayClient();

    const order =
      await razorpay.orders.create({
        amount: Math.round(
          Number(amount) * 100
        ),
        currency,
        receipt,
        notes,
      });

    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      receipt: order.receipt,
      notes: order.notes,
      provider: this.name,
      raw: order,
    };
  },

  verifySignature({
    orderId,
    paymentId,
    signature,
  }) {
    if (
      !orderId ||
      !paymentId ||
      !signature
    ) {
      return false;
    }

    if (
      !process.env.RAZORPAY_KEY_SECRET
    ) {
      throw new Error(
        "RAZORPAY_KEY_SECRET is not defined."
      );
    }

    const generatedSignature =
      crypto
        .createHmac(
          "sha256",
          process.env.RAZORPAY_KEY_SECRET
        )
        .update(
          `${orderId}|${paymentId}`
        )
        .digest("hex");

    const generatedBuffer =
      Buffer.from(generatedSignature);

    const receivedBuffer =
      Buffer.from(signature);

    if (
      generatedBuffer.length !==
      receivedBuffer.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      generatedBuffer,
      receivedBuffer
    );
  },

  async fetchOrder(orderId) {
    const razorpay =
      getRazorpayClient();

    const order =
      await razorpay.orders.fetch(
        orderId
      );

    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      receipt: order.receipt,
      notes: order.notes,
      provider: this.name,
      raw: order,
    };
  },

  async fetchPayment(paymentId) {
    const razorpay =
      getRazorpayClient();

    const payment =
      await razorpay.payments.fetch(
        paymentId
      );

    return {
      id: payment.id,
      orderId: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      provider: this.name,
      raw: payment,
    };
  },
};

/*
 * =========================================
 * PROVIDER REGISTRY
 * =========================================
 */

const paymentProviders = {
  razorpay: razorpayProvider,
};

/*
 * =========================================
 * ACTIVE PROVIDER
 * =========================================
 */

const getActiveProviderName = () => {
  return (
    process.env.PAYMENT_PROVIDER ||
    "razorpay"
  ).toLowerCase();
};

const getPaymentProvider = () => {
  const providerName =
    getActiveProviderName();

  const provider =
    paymentProviders[providerName];

  if (!provider) {
    throw new Error(
      `Unsupported payment provider: ${providerName}`
    );
  }

  return provider;
};

/*
 * =========================================
 * GENERIC PAYMENT SERVICE
 * =========================================
 */

export const createPaymentOrder = async (
  options
) => {
  const provider =
    getPaymentProvider();

  return provider.createOrder(
    options
  );
};

export const verifyPaymentSignature = (
  options
) => {
  const provider =
    getPaymentProvider();

  return provider.verifySignature(
    options
  );
};

export const fetchPaymentOrder = async (
  orderId
) => {
  const provider =
    getPaymentProvider();

  return provider.fetchOrder(
    orderId
  );
};

export const fetchPayment = async (
  paymentId
) => {
  const provider =
    getPaymentProvider();

  return provider.fetchPayment(
    paymentId
  );
};

export const getPaymentProviderName =
  () => {
    return getPaymentProvider().name;
  };

export default {
  createPaymentOrder,
  verifyPaymentSignature,
  fetchPaymentOrder,
  fetchPayment,
  getPaymentProviderName,
};