import jwt from "jsonwebtoken";

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in server/.env");
  }

  return process.env.JWT_SECRET;
};

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    getJwtSecret(),
    {
      expiresIn: "15m",
    }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
    },
    getJwtSecret(),
    {
      expiresIn: "30d",
    }
  );
};

export const verifyToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};