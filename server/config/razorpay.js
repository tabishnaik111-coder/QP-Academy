import Razorpay from "razorpay";

const getRazorpayClient = () => {
  if (
    !process.env.RAZORPAY_KEY_ID ||
    !process.env.RAZORPAY_KEY_SECRET
  ) {
    throw new Error(
      "Razorpay credentials are not configured."
    );
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret:
      process.env.RAZORPAY_KEY_SECRET,
  });
};

export default getRazorpayClient;