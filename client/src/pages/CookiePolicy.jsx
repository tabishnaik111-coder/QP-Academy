const CookiePolicy = () => {
  return (
    <main className="legal-page">
      <section className="legal-hero qpa-section">
        <div className="qpa-container">
          <span className="qpa-badge">
            <i className="fa-solid fa-cookie-bite" />
            Legal
          </span>

          <h1>Cookie Policy</h1>

          <p>Last updated: September 2026</p>
        </div>
      </section>

      <section className="legal-content qpa-section-sm">
        <div className="qpa-container legal-container">
          <p>
            This Cookie Policy explains how QPA Academy uses
            cookies when you visit our website.
          </p>

          <h2>1. What are cookies</h2>
          <p>
            Cookies are small text files stored on your device by
            your browser. They let a website remember information
            about your visit, such as whether you're logged in.
          </p>

          <h2>2. Cookies we use</h2>
          <ul>
            <li>
              <strong>Essential cookies:</strong> keep you logged
              in (access and refresh tokens) and let the site
              function correctly. These cannot be turned off
              without breaking login.
            </li>
            <li>
              <strong>Preference cookies:</strong> remember basic
              settings such as your last visited tab, where
              applicable.
            </li>
          </ul>
          <p>We do not currently use advertising or third-party tracking cookies.</p>

          <h2>3. How long cookies last</h2>
          <p>
            Our login cookies are set to keep you signed in for up
            to 30 days of activity, or until you log out. You can
            clear cookies at any time through your browser
            settings, which will log you out.
          </p>

          <h2>4. Managing cookies</h2>
          <p>
            Most browsers let you block or delete cookies through
            their settings. Blocking essential cookies will prevent
            you from staying logged in and using course features
            that require an account.
          </p>

          <h2>5. Changes to this policy</h2>
          <p>
            We may update this policy as our platform changes.
            Check back here for the latest version.
          </p>

          <h2>6. Contact us</h2>
          <p>
            Questions about cookies can be sent to{" "}
            <a href="mailto:support@qpa-academy.example">
              support@qpa-academy.example
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
};

export default CookiePolicy;
