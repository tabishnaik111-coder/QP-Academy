import User from "../models/User.js";

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

export const requireAuth = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Authentication service is not configured.",
      });
    }

    let accessToken = req.cookies[ACCESS_TOKEN_COOKIE];

    /*
     * -----------------------------------------
     * 1. TRY CURRENT ACCESS TOKEN
     * -----------------------------------------
     */

    if (accessToken) {
      try {
        const decoded = verifyToken(accessToken);

        const user = await User.findById(decoded.userId);

        if (!user) {
          return res.status(401).json({
            success: false,
            message: "User account not found.",
            code: "USER_NOT_FOUND",
          });
        }

        if (!user.isActive) {
          return res.status(403).json({
            success: false,
            message: "This account has been deactivated.",
            code: "ACCOUNT_INACTIVE",
          });
        }

        req.user = user;

        return next();
      } catch {
        /*
         * Access token is invalid or expired.
         *
         * We do NOT immediately reject the request.
         * We will try the refresh token below.
         */
      }
    }

    /*
     * -----------------------------------------
     * 2. ACCESS TOKEN FAILED
     *    TRY REFRESH TOKEN
     * -----------------------------------------
     */

    const refreshToken =
      req.cookies[REFRESH_TOKEN_COOKIE];

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
        code: accessToken
          ? "INVALID_OR_EXPIRED_TOKEN"
          : "NO_ACCESS_TOKEN",
      });
    }

    let refreshDecoded;

    try {
      refreshDecoded = verifyToken(refreshToken);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
        code: "INVALID_REFRESH_TOKEN",
      });
    }

    /*
     * -----------------------------------------
     * 3. FIND USER FROM REFRESH TOKEN
     * -----------------------------------------
     */

    const user = await User.findById(
      refreshDecoded.userId
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found.",
        code: "USER_NOT_FOUND",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "This account has been deactivated.",
        code: "ACCOUNT_INACTIVE",
      });
    }

    /*
     * -----------------------------------------
     * 4. CREATE NEW ACCESS TOKEN
     * -----------------------------------------
     */

    const newAccessToken =
      generateAccessToken(user);

    const cookieOptions =
      getAuthCookieOptions();

    res.cookie(
      ACCESS_TOKEN_COOKIE,
      newAccessToken,
      {
        ...cookieOptions,
        maxAge: ACCESS_TOKEN_MAX_AGE,
      }
    );

    /*
     * Sliding session:
     *
     * Every time the refresh token is used, issue a
     * brand-new one with a full lifetime. A student who
     * keeps using the site is never logged out; they only
     * leave when they log out themselves or stay away for
     * the whole refresh-token lifetime.
     */

    res.cookie(
      REFRESH_TOKEN_COOKIE,
      generateRefreshToken(user),
      {
        ...cookieOptions,
        maxAge: REFRESH_TOKEN_MAX_AGE,
      }
    );

    /*
     * -----------------------------------------
     * 5. CONTINUE ORIGINAL REQUEST
     * -----------------------------------------
     */

    req.user = user;

    return next();
  } catch (error) {
    console.error(
      "Authentication middleware error:",
      error
    );

    return res.status(401).json({
      success: false,
      message: "Authentication required.",
      code: "AUTHENTICATION_FAILED",
    });
  }
};