function LoadingSpinner({ size = "medium", label = "Loading..." }) {
  return (
    <div
      className={`qpa-loading qpa-loading-${size}`}
      role="status"
      aria-label={label}
    >
      <span className="qpa-spinner"></span>
      <span className="qpa-loading-text">{label}</span>
    </div>
  );
}

export default LoadingSpinner;