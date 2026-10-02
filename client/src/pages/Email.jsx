import { Link } from "react-router-dom";

const SUPPORT_EMAIL = "quickpenacademy111@gmail.com";

const Email = () => {
  const subject = encodeURIComponent("QPA Support Request");

  const body = encodeURIComponent(
    `Hello QPA Support Team,

I need help with:

[Please describe your issue here]

Thank you.`
  );

  const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL}&su=${subject}&body=${body}`;

  return (
    <main className="email-page">
      <div className="email-page-glow email-page-glow-one"></div>
      <div className="email-page-glow email-page-glow-two"></div>

      <div className="email-popup">
        <div className="email-popup-icon">
          <i className="fa-solid fa-envelope"></i>
        </div>

        <span className="email-popup-badge">
          QPA SUPPORT
        </span>

        <h1>Email Support</h1>

        <p className="email-popup-text">
          Need help? Send us an email through Gmail and our
          support team will get back to you.
        </p>

        <a
          href={gmailLink}
          target="_blank"
          rel="noopener noreferrer"
          className="email-address"
        >
          <i className="fa-solid fa-at"></i>
          <span>{SUPPORT_EMAIL}</span>
        </a>

        <div className="email-popup-actions">
          <a
            href={gmailLink}
            target="_blank"
            rel="noopener noreferrer"
            className="email-send-btn"
          >
            <i className="fa-solid fa-paper-plane"></i>
            Send Email
          </a>

          <Link
            to="/help"
            className="email-back-btn"
          >
            <i className="fa-solid fa-arrow-left"></i>
            Back to Help
          </Link>
        </div>
      </div>
    </main>
  );
};

export default Email;