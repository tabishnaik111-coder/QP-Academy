import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { resetPassword } from "../services/api";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!token) {
      setError(
        "This password reset link is invalid."
      );
      return;
    }

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters long."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await resetPassword({
        token,
        password,
      });

      setSuccess(
        response.message ||
          "Password reset successfully."
      );

      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/login", {
          replace: true,
        });
      }, 2000);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to reset your password right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
              PASSWORD RESET
            </span>

            <h1>
              Create a new{" "}
              <span>password</span>
            </h1>

            <p>
              Choose a strong new password for your QPA
              account.
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

          {success && (
            <div
              className="qpa-auth-success"
              role="status"
            >
              <i className="fa-solid fa-circle-check" />
              <span>{success}</span>
            </div>
          )}

          <form
            className="qpa-auth-form"
            onSubmit={handleSubmit}
          >
            <div className="qpa-form-group">
              <label htmlFor="reset-password">
                New password
              </label>

              <div className="qpa-input-wrapper">
                <i className="fa-solid fa-lock" />

                <input
                  id="reset-password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  placeholder="Enter your new password"
                  autoComplete="new-password"
                  required
                  disabled={isSubmitting}
                />

                <button
                  type="button"
                  className="qpa-password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (previous) => !previous
                    )
                  }
                  aria-label={
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

            <div className="qpa-form-group">
              <label htmlFor="reset-confirm-password">
                Confirm new password
              </label>

              <div className="qpa-input-wrapper">
                <i className="fa-solid fa-lock" />

                <input
                  id="reset-confirm-password"
                  name="confirmPassword"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(
                      event.target.value
                    );
                    setError("");
                  }}
                  placeholder="Confirm your new password"
                  autoComplete="new-password"
                  required
                  disabled={isSubmitting}
                />

                <button
                  type="button"
                  className="qpa-password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      (previous) => !previous
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  disabled={isSubmitting}
                >
                  <i
                    className={
                      showConfirmPassword
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
              disabled={isSubmitting || !!success}
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" />
                  Updating password...
                </>
              ) : (
                <>
                  Reset password
                  <i className="fa-solid fa-arrow-right" />
                </>
              )}
            </button>
          </form>

          <div className="qpa-auth-divider">
            <span>QPA</span>
          </div>

          <Link
            to="/login"
            className="qpa-auth-home-link"
          >
            <i className="fa-solid fa-arrow-left" />
            Back to sign in
          </Link>
        </section>
      </div>
    </main>
  );
};

export default ResetPassword;