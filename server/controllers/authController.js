import {
  randomBytes,
  createHash,
} from "node:crypto";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import { validateRegistration } from "../validators/authValidator.js";
import { sendEmail } from "../utils/email.js";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  getAuthCookieOptions,
} from "../config/auth.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from "../utils/auth.js";

const createSafeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  profileImage: user.profileImage,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const validation = validateRegistration({
      name,
      email,
      password,
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Please correct the highlighted fields.",
        errors: validation.errors,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
  name: normalizedName,
  email: normalizedEmail,
  passwordHash,
  role: "student",
  isActive: true,
});

const accessToken = generateAccessToken(user);
const refreshToken = generateRefreshToken(user);

const cookieOptions = getAuthCookieOptions();

res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
  ...cookieOptions,
  maxAge: ACCESS_TOKEN_MAX_AGE,
});

res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
  ...cookieOptions,
  maxAge: REFRESH_TOKEN_MAX_AGE,
});

return res.status(201).json({
  success: true,
  message: "Registration successful.",
  user: createSafeUser(user),
});
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create your account right now.",
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "This account has been deactivated.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const cookieOptions = getAuthCookieOptions();

    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      ...cookieOptions,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...cookieOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: createSafeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log in right now.",
    });
  }
};

export const getCurrentUser = async (req, res) => {
  return res.status(200).json({
    success: true,
    authenticated: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      profileImage: req.user.profileImage,
      isActive: req.user.isActive,
      createdAt: req.user.createdAt,
    },
  });
};

export const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE];

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh authentication required.",
      });
    }

    const decoded = verifyToken(refreshToken);

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "This account has been deactivated.",
      });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    const cookieOptions = getAuthCookieOptions();

    res.cookie(ACCESS_TOKEN_COOKIE, newAccessToken, {
      ...cookieOptions,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    res.cookie(REFRESH_TOKEN_COOKIE, newRefreshToken, {
      ...cookieOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    return res.status(200).json({
      success: true,
      message: "Session refreshed.",
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Session expired. Please log in again.",
    });
  }
};

export const logoutUser = async (req, res) => {
  const cookieOptions = getAuthCookieOptions();

  res.clearCookie(ACCESS_TOKEN_COOKIE, cookieOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions);

  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email address is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    // Always return the same response so we don't reveal
    // whether an account exists with this email.
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    }

    if (!user.isActive) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    }

    // Generate a secure random token.
    const resetToken = randomBytes(32).toString("hex");

    // Store only the hashed token in MongoDB.
    const hashedResetToken = createHash("sha256")
  .update(resetToken)
  .digest("hex");

    // Token will remain valid for 15 minutes.
    user.passwordResetToken = hashedResetToken;
    user.passwordResetExpires =
      Date.now() + 15 * 60 * 1000;

    await user.save();

    const clientUrl =
      process.env.CLIENT_URL ||
      "http://localhost:5173";

    const resetUrl =
      `${clientUrl}/reset-password/${resetToken}`;

    try {
      await sendEmail({
        to: user.email,

        subject: "Reset your QPA password",

        html: `
          <!DOCTYPE html>
          <html>
            <body
              style="
                margin: 0;
                padding: 40px 20px;
                background: #f4f4f5;
                font-family: Arial, sans-serif;
              "
            >
              <div
                style="
                  max-width: 600px;
                  margin: 0 auto;
                  background: #ffffff;
                  padding: 40px;
                  border-radius: 16px;
                "
              >
                <h1
                  style="
                    margin: 0 0 20px;
                    font-size: 28px;
                  "
                >
                  Quick Pen Academy
                </h1>

                <p
                  style="
                    font-size: 16px;
                    line-height: 1.6;
                  "
                >
                  We received a request to reset the
                  password for your QPA account.
                </p>

                <p
                  style="
                    font-size: 16px;
                    line-height: 1.6;
                  "
                >
                  Click the button below to create a
                  new password.
                </p>

                <div
                  style="
                    margin: 30px 0;
                    text-align: center;
                  "
                >
                  <a
                    href="${resetUrl}"
                    style="
                      display: inline-block;
                      padding: 14px 28px;
                      background: #111111;
                      color: #ffffff;
                      text-decoration: none;
                      border-radius: 10px;
                      font-size: 16px;
                      font-weight: 600;
                    "
                  >
                    Reset Password
                  </a>
                </div>

                <p
                  style="
                    font-size: 14px;
                    line-height: 1.6;
                    color: #666666;
                  "
                >
                  This link will expire in 15 minutes.
                </p>

                <p
                  style="
                    font-size: 14px;
                    line-height: 1.6;
                    color: #666666;
                  "
                >
                  If you did not request a password reset,
                  you can safely ignore this email.
                </p>

                <p
                  style="
                    margin-top: 30px;
                    font-size: 14px;
                    color: #666666;
                  "
                >
                  Quick Pen Academy — QPA
                </p>
              </div>
            </body>
          </html>
        `,
      });
    } catch (emailError) {
      // Don't leave a valid reset token behind if
      // the email could not be delivered.
      user.passwordResetToken = null;
      user.passwordResetExpires = null;

      await user.save();

      console.error(
        "Password reset email error:",
        emailError
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to send the password reset email right now.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Unable to process your request right now.",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Reset token and new password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long.",
      });
    }

    const hashedToken = createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: {
        $gt: Date.now(),
      },
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "This password reset link is invalid or has expired.",
      });
    }

    const passwordHash = await bcrypt.hash(
      password,
      12
    );

    user.passwordHash = passwordHash;

    // Invalidate the reset token immediately.
    user.passwordResetToken = null;
    user.passwordResetExpires = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Unable to reset your password right now.",
    });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Google authentication failed.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "This account has been deactivated.",
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const cookieOptions = getAuthCookieOptions();

    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      ...cookieOptions,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...cookieOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    const clientUrl =
      process.env.CLIENT_URL || "http://localhost:5173";

    const redirectPath =
      user.role === "admin"
        ? "/admin"
        : "/dashboard";

    return res.redirect(
      `${clientUrl}${redirectPath}?google=success`
    );
  } catch (error) {
    console.error("Google login error:", error);

    const clientUrl =
      process.env.CLIENT_URL || "http://localhost:5173";

    return res.redirect(
      `${clientUrl}/login?google=failed`
    );
  }
};