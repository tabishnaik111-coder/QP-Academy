const PrivacyPolicy = () => {
  return (
    <main className="legal-page">
      <section className="legal-hero qpa-section">
        <div className="qpa-container">
          <span className="qpa-badge">
            <i className="fa-solid fa-shield-halved" />
            Legal
          </span>

          <h1>Privacy Policy</h1>

          <p>Last updated: September 2026</p>
        </div>
      </section>

      <section className="legal-content qpa-section-sm">
        <div className="qpa-container legal-container">
          <p>
            This Privacy Policy explains what information QPA
            Academy ("we", "us") collects when you use our
            website, and how we use, store and protect it.
          </p>

          <h2>1. Information we collect</h2>
          <ul>
            <li>
              <strong>Account information:</strong> your name,
              email address and password (stored securely as a
              hash, never in plain text).
            </li>
            <li>
              <strong>Course activity:</strong> enrollments,
              lesson progress, dictation and test attempts,
              scores, WPM and accuracy.
            </li>
            <li>
              <strong>Payment information:</strong> for paid
              courses, payments are processed by Razorpay. We do
              not store your card or UPI details; we only keep a
              record of the transaction ID, amount and status.
            </li>
            <li>
              <strong>Technical information:</strong> IP address,
              browser type and basic usage logs, used for
              security and to keep the service running.
            </li>
          </ul>

          <h2>2. How we use your information</h2>
          <ul>
            <li>To provide access to courses you enroll in or purchase.</li>
            <li>To track and show your learning progress, statistics and leaderboard ranking.</li>
            <li>To communicate with you about your account, purchases or support requests.</li>
            <li>To keep the platform secure and prevent misuse.</li>
          </ul>

          <h2>3. Sharing your information</h2>
          <p>
            We do not sell your personal information. We share
            data only with service providers who help us run the
            platform, such as our payment processor (Razorpay) and
            hosting provider, and only to the extent needed for
            them to perform their service.
          </p>

          <h2>4. Your leaderboard visibility</h2>
          <p>
            Your name and profile photo may appear on public
            leaderboards alongside your best scores. If you would
            like to opt out of public leaderboards, contact us and
            we will exclude your account.
          </p>

          <h2>5. Data retention</h2>
          <p>
            We keep your account and activity data for as long as
            your account is active. You may request deletion of
            your account and associated data at any time by
            contacting support.
          </p>

          <h2>6. Cookies</h2>
          <p>
            We use cookies to keep you logged in and to remember
            basic preferences. See our{" "}
            <a href="/cookies">Cookie Policy</a> for details.
          </p>

          <h2>7. Your rights</h2>
          <p>
            You can access, correct or delete your personal
            information by contacting us at{" "}
            <a href="mailto:support@qpa-academy.example">
              support@qpa-academy.example
            </a>
            .
          </p>

          <h2>8. Changes to this policy</h2>
          <p>
            We may update this policy from time to time. Continued
            use of the platform after changes means you accept the
            updated policy.
          </p>

          <h2>9. Contact us</h2>
          <p>
            Questions about this policy can be sent to{" "}
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

export default PrivacyPolicy;
