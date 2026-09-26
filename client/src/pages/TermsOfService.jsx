const TermsOfService = () => {
  return (
    <main className="legal-page">
      <section className="legal-hero qpa-section">
        <div className="qpa-container">
          <span className="qpa-badge">
            <i className="fa-solid fa-file-contract" />
            Legal
          </span>

          <h1>Terms of Service</h1>

          <p>Last updated: September 2026</p>
        </div>
      </section>

      <section className="legal-content qpa-section-sm">
        <div className="qpa-container legal-container">
          <p>
            These Terms of Service govern your use of QPA Academy
            ("we", "us", "the platform"). By creating an account or
            using our courses, you agree to these terms.
          </p>

          <h2>1. Using your account</h2>
          <ul>
            <li>You must provide accurate information when registering.</li>
            <li>You are responsible for keeping your password confidential and for all activity under your account.</li>
            <li>You must be old enough to legally agree to these terms in your country, or have a parent or guardian's permission.</li>
          </ul>

          <h2>2. Courses and access</h2>
          <ul>
            <li>Free courses can be accessed by enrolling at no cost.</li>
            <li>Paid courses require successful payment through our payment processor. Access is granted once payment is verified.</li>
            <li>Course content is for your personal, non-commercial use. Sharing your account or redistributing course content is not permitted.</li>
          </ul>

          <h2>3. Payments and refunds</h2>
          <p>
            Prices are shown in Indian Rupees (INR) unless stated
            otherwise. Refund requests must be made within 7 days
            of purchase by contacting support with your payment
            ID; refunds are considered on a case-by-case basis.
          </p>

          <h2>4. Leaderboards and fair use</h2>
          <p>
            Leaderboard rankings are based on your test and
            dictation results. Attempting to manipulate scores
            through automated tools, scripts, or exploiting bugs is
            not permitted and may result in removal from the
            leaderboard or account suspension.
          </p>

          <h2>5. Account suspension</h2>
          <p>
            We may suspend or deactivate accounts that violate
            these terms, engage in abusive behavior, or attempt to
            compromise the security of the platform.
          </p>

          <h2>6. Intellectual property</h2>
          <p>
            All course content, including lessons, dictation audio
            and transcripts, is owned by QPA Academy or its
            instructors and may not be copied, redistributed or
            resold without permission.
          </p>

          <h2>7. Disclaimer</h2>
          <p>
            The platform is provided "as is". We work to keep it
            available and accurate but do not guarantee
            uninterrupted access or that results (such as WPM
            improvement) will meet any particular expectation.
          </p>

          <h2>8. Changes to these terms</h2>
          <p>
            We may update these terms from time to time. Continued
            use of the platform after changes means you accept the
            updated terms.
          </p>

          <h2>9. Contact us</h2>
          <p>
            Questions about these terms can be sent to{" "}
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

export default TermsOfService;
