import PropTypes from "prop-types";

/** Render one dashboard metric or an explicitly unresolved metric slot. */
export function StatCard({ label, value, disabled = false }) {
  return (
    <article
      aria-disabled={disabled || undefined}
      className={`rounded-xl border bg-white p-5 shadow-sm ${disabled ? "border-dashed border-slate-300" : "border-slate-200"}`}
    >
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold tabular-nums ${disabled ? "text-slate-400" : "text-slate-900"}`}>
        {disabled ? "—" : value}
      </p>
      {disabled && <p className="mt-2 text-sm font-medium text-slate-500">Pending decision</p>}
    </article>
  );
}

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  disabled: PropTypes.bool,
};

export default StatCard;
