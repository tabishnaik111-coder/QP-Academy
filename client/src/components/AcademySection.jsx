import { Link } from "react-router-dom";
const features = [
  {
    icon: "01",
    title: "Structured Learning",
    description:
      "Follow organized lessons that take you from fundamentals to advanced practice.",
  },
  {
    icon: "02",
    title: "Real Practice",
    description:
      "Train with practical typing and dictation exercises instead of only watching lessons.",
  },
  {
    icon: "03",
    title: "Track Progress",
    description:
      "Monitor speed, accuracy, mistakes and results as your skills improve.",
  },
  {
    icon: "04",
    title: "Compete & Improve",
    description:
      "Use course and global leaderboards to challenge yourself and stay motivated.",
  },
];

function AcademySection() {
  return (
    <section id="about" className="qpa-academy-section">
      <div className="qpa-container">
        <div className="qpa-academy-layout">
          <div className="qpa-academy-copy">
            <span className="qpa-section-eyebrow">THE QPA METHOD</span>

            <h2>
              Practice with purpose.
              <br />
              <span className="qpa-gradient-text">
                Progress with confidence.
              </span>
            </h2>

            <p>
              QPA combines structured courses, focused practice and measurable
              performance tracking into one learning experience.
            </p>

            <div style={{ marginTop: "28px" }}>
             <Link
  to="/courses"
  className="qpa-btn qpa-btn-primary"
>
  Start Learning
  <span>→</span>
</Link>
            </div>
          </div>

          <div className="qpa-academy-features">
            {features.map((feature) => (
              <article className="qpa-academy-feature" key={feature.title}>
                <div className="qpa-academy-feature-icon">
                  {feature.icon}
                </div>

                <h3>{feature.title}</h3>

                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AcademySection;