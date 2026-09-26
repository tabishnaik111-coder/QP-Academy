import { Link } from "react-router-dom";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="contact" className="qpa-footer">
      <div className="qpa-footer-glow qpa-footer-glow-one"></div>
      <div className="qpa-footer-glow qpa-footer-glow-two"></div>

      <div className="qpa-container">
        <div className="qpa-footer-top">
          <div className="qpa-footer-brand">
            <Link to="/" className="qpa-footer-logo">
              <span className="qpa-footer-logo-mark">Q</span>

              <span>
                <strong>QPA</strong>
                <small>Quick Pen Academy</small>
              </span>
            </Link>

            <p>
              Learn, practice, improve and master your typing and dictation
              skills with QPA.
            </p>

            <div className="qpa-footer-socials">
              <a
                href="https://www.instagram.com/t._abish_/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <i className="fa-brands fa-instagram"></i>
              </a>

              <a
                href="https://www.youtube.com/@TabishNaik1"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
              >
                <i className="fa-brands fa-youtube"></i>
              </a>

              <a
                href="#"
                aria-label="Facebook"
              >
                <i className="fa-brands fa-facebook-f"></i>
              </a>
            </div>
          </div>

          <div className="qpa-footer-column">
            <h3>Academy</h3>

            <Link to="/courses">
              Courses
            </Link>

            <Link to="/about">
              About QPA
            </Link>

            <Link to="/leaderboard">
              Leaderboard
            </Link>

            <Link to="/courses">
              Practice
            </Link>
          </div>

          <div className="qpa-footer-column">
            <h3>Resources</h3>

            <Link to="/courses">
              Typing Tests
            </Link>

            <Link to="/courses">
              Dictation Practice
            </Link>

            <Link to="/courses">
              Learning Center
            </Link>

            <Link to="/help">
              Help Center
            </Link>
          </div>

          <div className="qpa-footer-column">
            <h3>Account</h3>

            <Link to="/login">
              Log In
            </Link>

            <Link to="/register">
              Create Account
            </Link>

            <Link to="/profile">
              My Dashboard
            </Link>

            <Link to="/courses">
              My Courses
            </Link>
          </div>
        </div>

        <div className="qpa-footer-divider"></div>

        <div className="qpa-footer-bottom">
          <p>© {currentYear} QPA — Quick Pen Academy. All rights reserved.</p>

          <div className="qpa-footer-legal">
            <Link to="/privacy">
              Privacy
            </Link>

            <Link to="/terms">
              Terms
            </Link>

            <Link to="/cookies">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;