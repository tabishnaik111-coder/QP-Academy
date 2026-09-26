export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
  });
};

export const errorHandler = (error, req, res, next) => {
  console.error("QPA API Error:", error);

  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || error.status || 500;

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: Object.values(error.errors).map(
        (item) => item.message
      ),
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid resource identifier.",
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "A record with this value already exists.",
    });
  }

  const response = {
    success: false,
    message:
      statusCode >= 500
        ? "An internal server error occurred."
        : error.message || "Request failed.",
  };

  if (process.env.NODE_ENV !== "production") {
    response.error = error.message;
  }

  return res.status(statusCode).json(response);
};