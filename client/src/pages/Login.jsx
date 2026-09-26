import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    isLoading,
    login,
  } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const redirectPath =
    location.state?.from || "/dashboard";

  /*
   * If the user is already authenticated,
   * don't allow them to remain on the login page.
   */
  useEffect(() => {
    if (!isLoading && user) {
      const destination =
        user.role === "admin"
          ? "/admin"
          : redirectPath;

      navigate(destination, {
        replace: true,
      });
    }
  }, [
    user,
    isLoading,
    navigate,
    redirectPath,
  ]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!form.email.trim() || !form.password) {
      setError(
        "Please enter your email and password."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      /*
       * Authentication is now handled centrally
       * by AuthContext.
       *
       * AuthContext.login():
       * 1. Calls /auth/login
       * 2. Receives the session cookie
       * 3. Calls /auth/me
       * 4. Restores the authenticated user
       */
      const authenticatedUser = await login({
        email: form.email.trim(),
        password: form.password,
      });

      const destination =
        authenticatedUser?.role === "admin"
          ? "/admin"
          : redirectPath;

      navigate(destination, {
        replace: true,
      });
    } catch (loginError) {
      setError(
        loginError.message ||
          "Unable to log in. Please check your credentials."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return null;
  }

  /*
   * The redirect effect handles authenticated users.
   * This prevents the login form from being displayed
   * unnecessarily after session restoration.
   */
  if (user) {
    return null;
  }

  return (
    <main className="qpa-auth-page">
      <div className="qpa-auth-background" />

      <div className="qpa-auth-container">
        <section className="qpa-auth-card">
          <Link
            to="/"
            className="qpa-auth-logo"
            aria-label="QPA home"
          >
            QPA
          </Link>

          <div className="qpa-auth-header">
            <span className="qpa-auth-eyebrow">
              WELCOME BACK
            </span>

            <h1>
              Sign in to{" "}
              <span>QPA</span>
            </h1>

            <p>
              Continue learning, practicing and improving
              your skills.
            </p>
          </div>

          {error && (
            <div
              className="qpa-auth-error"
              role="alert"
            >
              <i className="fa-solid fa-circle-exclamation" />
              <span>{error}</span>
            </div>
          )}

          <form
            className="qpa-auth-form"
            onSubmit={handleSubmit}
          >
            <div className="qpa-form-group">
              <label htmlFor="login-email">
                Email address
              </label>

              <div className="qpa-input-wrapper">
                <i className="fa-regular fa-envelope" />

                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="qpa-form-group">
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "12px",
    }}
  >
    <label htmlFor="login-password">
      Password
    </label>

    <Link
      to="/forget-password"
      style={{
        fontSize: "13px",
        fontWeight: "600",
        textDecoration: "none",
      }}
    >
      Forgot password?
    </Link>
  </div>

             <div className="qpa-input-wrapper">
  <i className="fa-solid fa-lock" />

  <input
    id="login-password"
    name="password"
    type={showPassword ? "text" : "password"}
    value={form.password}
    onChange={handleChange}
    placeholder="Enter your password"
    autoComplete="current-password"
    required
    disabled={isSubmitting}
  />

  <button
    type="button"
    className="qpa-password-toggle"
    onClick={() =>
      setShowPassword((previous) => !previous)
    }
    aria-label={
      showPassword
        ? "Hide password"
        : "Show password"
    }
    title={
      showPassword
        ? "Hide password"
        : "Show password"
    }
    disabled={isSubmitting}
  >
    <i
      className={
        showPassword
          ? "fa-solid fa-eye-slash"
          : "fa-solid fa-eye"
      }
    />
  </button>
</div>
            </div>

            <button
              type="submit"
              className="qpa-auth-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <i className="fa-solid fa-arrow-right" />
                </>
              )}
            </button>
          </form>

<div className="qpa-auth-divider">
  <span>OR</span>
</div>

<a
  href="http://localhost:5000/api/auth/google"
  className="qpa-google-login"
>
  <i className="fa-brands fa-google" />
  <span>Continue with Google</span>
</a>

<div className="qpa-auth-divider">
  <span>QPA</span>
</div>

          <p className="qpa-auth-footer-text">
            Don't have an account?{" "}
            <Link
  to="/register"
  state={{ from: redirectPath }}
>
  Create one
</Link>
          </p>

          <Link
            to="/"
            className="qpa-auth-home-link"
          >
            <i className="fa-solid fa-arrow-left" />
            Back to homepage
          </Link>
        </section>
      </div>
    </main>
  );
};

export default Login;