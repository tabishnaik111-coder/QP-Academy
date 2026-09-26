import { Link } from "react-router-dom";

const faqs = [
  {
    q: "How do I enroll in a course?",
    a: "Open the course page and click Start Course for free courses, or Buy Now for paid ones. Once enrolled, use Continue Course to jump back in any time.",
  },
  {
    q: "I bought a course but it still shows Buy Now. What do I do?",
    a: "Refresh the page after payment. If it still shows Buy Now, log out and log back in, then check your Dashboard to see if the course appears there. If not, contact us with your payment ID.",
  },
  {
    q: "Can I redo a dictation after finishing it?",
    a: "Yes. Open the lesson and click Try Again on the results screen. Every attempt is saved, and your best score is what counts on the leaderboard.",
  },
  {
    q: "How is my WPM and accuracy calculated?",
    a: "WPM is based on correctly typed words over the time you took, and accuracy compares your typed text with the original. Both are calculated automatically when you submit a test or dictation.",
  },
  {
    q: "How do I leave a review for a course?",
    a: "You need to be enrolled in the course. Scroll to the Reviews section on the course page and choose a star rating, with an optional comment.",
  },
  {
    q: "I'm having trouble logging in or staying logged in.",
    a: "Make sure cookies are enabled in your browser. If you're still logged out unexpectedly, try clearing your browser cache or contact support with details of what happens.",
  },
  {
    q: "How do I request a refund?",
    a: "Contact us with your payment ID and the course name within 7 days of purchase. We'll review the request and get back to you.",
  },
];

const HelpCenter = () => {
  return (
    <main className="help-page">
      <section className="help-hero qpa-section">
        <div className="qpa-container">
          <span className="qpa-badge">
            <i className="fa-solid fa-circle-question" />
            Help Center
          </span>

          <h1>How can we help?</h1>

          <p>
            Find answers to common questions, or reach out to our
            team directly.
          </p>
        </div>
      </section>

      <section className="help-content qpa-section-sm">
        <div className="qpa-container">
          <div className="help-layout">
            <div className="help-faq-panel">
              <h2>Frequently asked questions</h2>

              <div className="help-faq-list">
                {faqs.map((item, index) => (
                  <details className="help-faq-item" key={index}>
                    <summary>
                      {item.q}
                      <i className="fa-solid fa-chevron-down" />
                    </summary>

                    <p>{item.a}</p>
                  </details>
                ))}
              </div>
            </div>

            <aside className="help-contact-card qpa-card">
              <h3>Still need help?</h3>

              <p>
                Our support team typically responds within 24
                hours.
              </p>

              <Link
                to="/email"
                className="qpa-btn qpa-btn-primary help-contact-btn"
              >
                <i className="fa-solid fa-envelope" />
                Email Support
              </Link>
              <div className="help-contact-links">
                <Link to="/courses">
                  <i className="fa-solid fa-book-open" />
                  Browse Courses
                </Link>

                <Link to="/privacy">
                  <i className="fa-solid fa-shield-halved" />
                  Privacy Policy
                </Link>

                <Link to="/terms">
                  <i className="fa-solid fa-file-contract" />
                  Terms of Service
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
};

export default HelpCenter;
