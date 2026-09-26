import { useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {useAuth} from "../context/AuthContext";

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();

const redirectPath =
  location.state?.from || "/dashboard";

  const {
    user,
    isLoading,
    register,
  } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /*
   * Wait for the existing authentication session
   * to be restored before deciding what to display.
   */
  if (isLoading) {
    return null;
  }

  /*
   * Authenticated users should never remain
   * on the registration page.
   */
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

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

    const name = form.name.trim();
    const email = form.email.trim();

    if (!name) {
      setError("Please enter your full name.");
      return;
    }

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (form.password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);

      /*
       * Registration is handled centrally by AuthContext.
       *
       * AuthContext.register():
       * 1. Creates the account
       * 2. Receives the authenticated session
       * 3. Restores the current user through /auth/me
       */
      await register({
        name,
        email,
        password: form.password,
      });

      /*
       * Registration has successfully authenticated
       * the user, so send them directly to Dashboard.
       */
     navigate(redirectPath, {
  replace: true,
});
    } catch (registrationError) {
      setError(
        registrationError.message ||
          "Registration failed. Please try again."
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
              JOIN QPA
            </span>

            <h1>
              Create your{" "}
              <span>QPA account.</span>
            </h1>

            <p>
              Start learning, practicing and improving
              with Quick Pen Academy.
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
              <label htmlFor="register-name">
                Full name
              </label>

              <div className="qpa-input-wrapper">
                <i className="fa-regular fa-user" />

                <input
                  id="register-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  autoComplete="name"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="qpa-form-group">
              <label htmlFor="register-email">
                Email address
              </label>

              <div className="qpa-input-wrapper">
                <i className="fa-regular fa-envelope" />

                <input
                  id="register-email"
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
              <label htmlFor="register-password">
                Password
              </label>

              <div className="qpa-input-wrapper">
                <i className="fa-solid fa-lock" />

                <input
                  id="register-password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="qpa-form-group">
              <label htmlFor="register-confirm-password">
                Confirm password
              </label>

              <div className="qpa-input-wrapper">
                <i className="fa-solid fa-lock" />

                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
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
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <i className="fa-solid fa-arrow-right" />
                </>
              )}
            </button>
          </form>

          <div className="qpa-auth-divider">
            <span>QPA</span>
          </div>

          <p className="qpa-auth-footer-text">
            Already have an account?{" "}
            <Link to="/login">
              Sign in
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

export default Register;