import PropTypes from "prop-types";
import Avatar from "./Avatar";

/** Format an account timestamp for the responsive user list. */
function formatUserDate(value) {
  if (!value) return "Built-in account";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

/** Render role styling shared by desktop and mobile account views. */
function RoleBadge({ role }) {
  const styles = role === "admin" ? "bg-violet-100 text-violet-700 ring-violet-200" : "bg-indigo-100 text-indigo-700 ring-indigo-200";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${styles}`}>{role}</span>;
}

/** Render a deletion control with an accessible reason when it is protected. */
function DeleteControl({ disabled, disabledReason, displayName, onDelete }) {
  return (
    <span className="inline-block" title={disabled ? disabledReason : undefined}>
      <button
        aria-label={`Delete ${displayName}`}
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onClick={onDelete}
        type="button"
      >
        Delete
      </button>
    </span>
  );
}

/** Render an account as either a semantic table row or a mobile card. */
export function UserRow({ user, mode, deleteDisabled = false, disabledReason = "", onDelete }) {
  const details = (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar role={user.role} />
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900">{user.displayName}</p>
        <p className="truncate text-sm text-slate-500">@{user.username}</p>
      </div>
    </div>
  );

  if (mode === "mobile") {
    return (
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {details}
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-slate-500">Role</dt>
            <dd className="mt-2"><RoleBadge role={user.role} /></dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Created</dt>
            <dd className="mt-1 text-slate-700">{formatUserDate(user.createdAt)}</dd>
          </div>
        </dl>
        <div className="mt-5 border-t border-slate-100 pt-4">
          <DeleteControl disabled={deleteDisabled} disabledReason={disabledReason} displayName={user.displayName} onDelete={onDelete} />
        </div>
      </article>
    );
  }

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-5 py-4">{details}</td>
      <td className="px-5 py-4"><RoleBadge role={user.role} /></td>
      <td className="px-5 py-4 text-sm text-slate-600">{formatUserDate(user.createdAt)}</td>
      <td className="px-5 py-4 text-right">
        <DeleteControl disabled={deleteDisabled} disabledReason={disabledReason} displayName={user.displayName} onDelete={onDelete} />
      </td>
    </tr>
  );
}

RoleBadge.propTypes = {
  role: PropTypes.oneOf(["admin", "user"]).isRequired,
};

DeleteControl.propTypes = {
  disabled: PropTypes.bool.isRequired,
  disabledReason: PropTypes.string.isRequired,
  displayName: PropTypes.string.isRequired,
  onDelete: PropTypes.func.isRequired,
};

UserRow.propTypes = {
  user: PropTypes.shape({
    displayName: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    role: PropTypes.oneOf(["admin", "user"]).isRequired,
    createdAt: PropTypes.string,
  }).isRequired,
  mode: PropTypes.oneOf(["desktop", "mobile"]).isRequired,
  deleteDisabled: PropTypes.bool,
  disabledReason: PropTypes.string,
  onDelete: PropTypes.func.isRequired,
};

export default UserRow;
