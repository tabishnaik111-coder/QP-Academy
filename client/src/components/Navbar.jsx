import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navigate = useNavigate();

  const { user, isLoading, logout } = useAuth();

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);

      await logout();

      closeMenu();

      navigate("/", {
        replace: true,
      });
    } catch {
      /*
       * AuthContext.logout() clears the local user state
       * even if the server logout request fails.
       */
      closeMenu();

      navigate("/", {
        replace: true,
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navClass = ({ isActive }) =>
    `qpa-nav-link ${
      isActive ? "qpa-nav-link-active" : ""
    }`;

  return (
    <header className="qpa-navbar">
      <div className="qpa-container qpa-navbar-inner">

        {/* LOGO */}
        <Link
          to="/"
          className="qpa-logo"
          onClick={closeMenu}
          aria-label="Quick Pen Academy home"
        >
          <span className="qpa-logo-mark">
            Q
          </span>

          <span className="qpa-logo-text">
            Quick Pen <strong>Academy</strong>
          </span>
        </Link>

        {/* MOBILE MENU BUTTON */}
        <button
          type="button"
          className="qpa-menu-toggle"
          aria-label={
            isMenuOpen
              ? "Close navigation"
              : "Open navigation"
          }
          aria-expanded={isMenuOpen}
          onClick={() =>
            setIsMenuOpen(
              (previous) => !previous
            )
          }
        >
          <span />
          <span />
          <span />
        </button>

        {/* DESKTOP / MOBILE NAVIGATION */}
        <nav
          className={`qpa-nav-links ${
            isMenuOpen ? "open" : ""
          }`}
          aria-label="Main navigation"
        >
          {/* COURSES */}
          <NavLink
            to="/courses"
            className={navClass}
            onClick={closeMenu}
          >
            Courses
          </NavLink>

          {/* DASHBOARD — AUTHENTICATED ONLY */}
          {!isLoading && user && (
            <NavLink
              to="/dashboard"
              className={navClass}
              onClick={closeMenu}
            >
              Dashboard
            </NavLink>
          )}

          {/* LEADERBOARD */}
          <NavLink
            to="/leaderboard"
            className={navClass}
            onClick={closeMenu}
          >
            Leaderboard
          </NavLink>

          {/* ABOUT */}
          <a
            href="/#about"
            className="qpa-nav-link"
            onClick={closeMenu}
          >
            About
          </a>

          {/* AUTHENTICATED ACTIONS */}
          {!isLoading && user ? (
            <div className="qpa-navbar-actions">

              {/* ADMIN — ADMIN USERS ONLY */}
              {user.role === "admin" && (
                <NavLink
                  to="/admin"
                  className={navClass}
                  onClick={closeMenu}
                >
                  Admin
                </NavLink>
              )}

              {/* PROFILE */}
              <NavLink
                to="/profile"
                className="qpa-icon-nav-btn"
                onClick={closeMenu}
                aria-label="Profile"
                title="Profile"
              >
                <i className="fa-regular fa-user" />
              </NavLink>

              {/* LOGOUT */}
              <button
                type="button"
                className="qpa-icon-nav-btn qpa-logout-btn"
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-label="Log out"
                title="Log out"
              >
                {isLoggingOut ? (
                  <i className="fa-solid fa-spinner fa-spin" />
                ) : (
                  <i className="fa-solid fa-arrow-right-from-bracket" />
                )}
              </button>

            </div>
          ) : (
            /* LOGGED OUT */
            !isLoading && (
              <div className="qpa-navbar-actions">
                <Link
                  to="/login"
                  className="qpa-login-btn"
                  onClick={closeMenu}
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="qpa-register-btn"
                  onClick={closeMenu}
                >
                  Get Started
                </Link>
              </div>
            )
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;