function SectionHeading({
  eyebrow,
  title,
  highlight,
  description,
  align = "left",
}) {
  return (
    <div className={`qpa-reusable-heading qpa-heading-${align}`}>
      {eyebrow && (
        <span className="qpa-section-eyebrow">
          {eyebrow}
        </span>
      )}

      <h2>
        {title}

        {highlight && (
          <>
            <br />
            <span className="qpa-gradient-text">{highlight}</span>
          </>
        )}
      </h2>

      {description && <p>{description}</p>}
    </div>
  );
}

export default SectionHeading;