import Icon from './Icon';

function StatCard({ label, value, note, icon, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon name={icon} size={19} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
      <div className={`stat-decoration ${tone}`} />
    </div>
  );
}

export default StatCard;
