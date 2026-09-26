import { useState } from "react";
import { Link } from "react-router-dom";

import { forgotPassword } from "../services/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await forgotPassword(email.trim());

      setMessage(
        response.message ||
          "If an account exists with this email, a password reset link has been sent."
      );

      setEmail("");
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to process your request right now."
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
              ACCOUNT RECOVERY
            </span>

            <h1>
              Forgot your{" "}
              <span>password?</span>
            </h1>

            <p>
              Enter your email address and we'll send you
              a secure link to create a new password.
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

          {message && (
            <div
              className="qpa-auth-success"
              role="status"
            >
              <i className="fa-solid fa-circle-check" />
              <span>{message}</span>
            </div>
          )}

          <form
            className="qpa-auth-form"
            onSubmit={handleSubmit}
          >
            <div className="qpa-form-group">
              <label htmlFor="forgot-password-email">
                Email address
              </label>

              <div className="qpa-input-wrapper">
                <i className="fa-regular fa-envelope" />

                <input
                  id="forgot-password-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);

                    if (error) {
                      setError("");
                    }

                    if (message) {
                      setMessage("");
                    }
                  }}
                  placeholder="Enter your QPA email"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                />
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
                  Sending link...
                </>
              ) : (
                <>
                  Send reset link
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

export default ForgotPassword;