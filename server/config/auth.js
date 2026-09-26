export const ACCESS_TOKEN_COOKIE = "qpa_access_token";
export const REFRESH_TOKEN_COOKIE = "qpa_refresh_token";

export const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
export const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export const getAuthCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
};