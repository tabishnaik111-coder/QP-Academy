function EmptyState({
  icon = "—",
  title = "Nothing here yet",
  description = "There is nothing to display right now.",
  action,
}) {
  return (
    <div className="qpa-empty-state">
      <div className="qpa-empty-icon">{icon}</div>

      <h3>{title}</h3>

      <p>{description}</p>

      {action && <div className="qpa-empty-action">{action}</div>}
    </div>
  );
}

export default EmptyState;