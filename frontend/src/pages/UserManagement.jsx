import { useEffect, useRef, useState } from "react";
import { getSession } from "../utils/auth";
import { readUsers, saveUsers } from "../utils/storage";
import UserRow from "../components/UserRow";

const DEFAULT_ADMIN = {
  id: "admin",
  displayName: "Admin",
  username: "admin",
  role: "admin",
  createdAt: "",
};
const EMPTY_FORM = {
  displayName: "",
  username: "",
  password: "",
  role: "user",
};

/** Return a mutation-blocking warning for unreadable account data. */
function usersWarning(status) {
  return status === "corrupt"
    ? "Saved user data is corrupted. Account changes are blocked to prevent data loss. Inspect or clear this browser’s local data before continuing."
    : "Local browser user data is unavailable. Account changes are blocked until browser storage access is restored.";
}

/** Render account creation and protected deletion workflows. */
export function UserManagement() {
  const firstFieldRef = useRef(null);
  const [usersResult, setUsersResult] = useState({ data: [], status: "ok" });
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("status");

  useEffect(() => {
    setUsersResult(readUsers());
  }, []);

  /** Update one stable controlled account field. */
  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  /** Validate, re-read, create a UUID record, and clear only after persistence. */
  function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    const nextErrors = {};
    if (!form.displayName.trim())
      nextErrors.displayName = "Display Name is required.";
    if (!form.username.trim()) nextErrors.username = "Username is required.";
    if (!form.password) nextErrors.password = "Password is required.";
    if (form.role !== "admin" && form.role !== "user")
      nextErrors.role = "Choose a valid role.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      firstFieldRef.current?.focus();
      return;
    }

    const session = getSession();
    if (!session || session.role !== "admin") {
      setMessageType("alert");
      setMessage(
        "Your admin session is no longer valid. Account changes are blocked.",
      );
      return;
    }
    const current = readUsers();
    if (current.status !== "ok") {
      setUsersResult(current);
      return;
    }
    if (
      form.username === "admin" ||
      current.data.some((user) => user.username === form.username)
    ) {
      setErrors({ username: "Username already exists." });
      document.getElementById("account-username")?.focus();
      return;
    }

    let id;
    try {
      if (typeof globalThis.crypto?.randomUUID !== "function")
        throw new Error("unsupported");
      id = globalThis.crypto.randomUUID();
    } catch {
      setMessageType("alert");
      setMessage(
        "Your browser does not support secure account IDs. Use a modern browser and try again.",
      );
      return;
    }
    const newUser = {
      id,
      displayName: form.displayName.trim(),
      username: form.username,
      password: form.password,
      role: form.role,
      createdAt: new Date().toISOString(),
    };
    const nextUsers = [...current.data, newUser];
    if (!saveUsers(nextUsers)) {
      setMessageType("alert");
      setMessage(
        "The account could not be saved. The form has been preserved and nothing was changed. " +
          "Browser storage may be blocked or full; check site storage permissions or free space, then retry.",
      );
      return;
    }
    setUsersResult({ data: nextUsers, status: "ok" });
    setForm(EMPTY_FORM);
    setErrors({});
    setMessageType("status");
    setMessage(`Account for ${newUser.displayName} was created.`);
  }

  /** Re-read identity and users, protect special accounts, then confirm and persist. */
  function handleDelete(targetId) {
    setMessage("");
    const session = getSession();
    if (!session || session.role !== "admin") {
      setMessageType("alert");
      setMessage(
        "Your admin session is no longer valid. Account changes are blocked.",
      );
      return;
    }
    if (targetId === "admin") {
      setMessageType("alert");
      setMessage("Default admin cannot be deleted.");
      return;
    }
    if (targetId === session.userId) {
      setMessageType("alert");
      setMessage("You cannot delete the currently active account.");
      return;
    }
    const current = readUsers();
    if (current.status !== "ok") {
      setUsersResult(current);
      return;
    }
    const target = current.data.find((user) => user.id === targetId);
    if (!target) {
      setUsersResult(current);
      setMessageType("alert");
      setMessage("That account no longer exists. The list has been refreshed.");
      return;
    }
    if (!window.confirm(`Delete ${target.displayName}? This cannot be undone.`))
      return;
    const nextUsers = current.data.filter((user) => user.id !== targetId);
    if (!saveUsers(nextUsers)) {
      setMessageType("alert");
      setMessage(
        "The account could not be deleted. Nothing was changed. Browser storage may be blocked or full; " +
          "check site storage permissions or free space, then retry.",
      );
      return;
    }
    setUsersResult({ data: nextUsers, status: "ok" });
    setMessageType("status");
    setMessage(`Account for ${target.displayName} was deleted.`);
  }

  const session = getSession();
  const available = usersResult.status === "ok";
  const visibleUsers = available ? [DEFAULT_ADMIN, ...usersResult.data] : [];

  /** Resolve why one account's delete action must be disabled. */
  function deletionProtection(user) {
    if (user.id === "admin") return "Default admin cannot be deleted.";
    if (user.id === session?.userId)
      return "You cannot delete the currently active account.";
    return "";
  }

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-violet-700">
            Local administration
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            User Management
          </h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Create demo-only local accounts and manage eligible users. Passwords
            are stored as plaintext in this browser; never use a real password.
          </p>
        </div>

        {!available && (
          <p
            className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800"
            role="alert"
          >
            {usersWarning(usersResult.status)}
          </p>
        )}
        {message && (
          <p
            aria-live={messageType === "alert" ? "assertive" : "polite"}
            className={[
              "mt-6 rounded-lg border p-4 text-sm font-medium",
              messageType === "alert"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700",
            ].join(" ")}
            role={messageType}
          >
            {message}
          </p>
        )}

        <section
          aria-labelledby="create-account-heading"
          className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <h2
            className="text-xl font-bold text-slate-900"
            id="create-account-heading"
          >
            Create Account
          </h2>
          {!available ? (
            <p className="mt-3 text-sm text-slate-600">
              Creation is disabled while saved user data cannot be read safely.
            </p>
          ) : (
            <form
              autoComplete="off"
              className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2"
              noValidate
              onSubmit={handleSubmit}
            >
              <div>
                <label
                  className="block text-sm font-semibold text-slate-700"
                  htmlFor="account-display-name"
                >
                  Display Name
                </label>
                <input
                  aria-describedby={
                    errors.displayName
                      ? "account-display-name-error"
                      : undefined
                  }
                  aria-invalid={Boolean(errors.displayName)}
                  aria-required="true"
                  autoComplete="off"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
                  id="account-display-name"
                  name="displayName"
                  onChange={updateField}
                  ref={firstFieldRef}
                  type="text"
                  value={form.displayName}
                />
                {errors.displayName && (
                  <p
                    className="mt-1 text-sm text-red-600"
                    id="account-display-name-error"
                    role="alert"
                  >
                    {errors.displayName}
                  </p>
                )}
              </div>
              <div>
                <label
                  className="block text-sm font-semibold text-slate-700"
                  htmlFor="account-username"
                >
                  Username
                </label>
                <input
                  aria-describedby={
                    errors.username ? "account-username-error" : undefined
                  }
                  aria-invalid={Boolean(errors.username)}
                  aria-required="true"
                  autoCapitalize="none"
                  autoComplete="new-username"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
                  id="account-username"
                  name="username"
                  onChange={updateField}
                  type="text"
                  value={form.username}
                />
                {errors.username && (
                  <p
                    className="mt-1 text-sm text-red-600"
                    id="account-username-error"
                    role="alert"
                  >
                    {errors.username}
                  </p>
                )}
              </div>
              <div>
                <label
                  className="block text-sm font-semibold text-slate-700"
                  htmlFor="account-password"
                >
                  Password
                </label>
                <input
                  aria-describedby={`password-warning${errors.password ? " account-password-error" : ""}`}
                  aria-invalid={Boolean(errors.password)}
                  aria-required="true"
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
                  id="account-password"
                  name="password"
                  onChange={updateField}
                  type="password"
                  value={form.password}
                />
                <p
                  className="mt-1 text-xs text-slate-500"
                  id="password-warning"
                >
                  Demo only. Stored as plaintext.
                </p>
                {errors.password && (
                  <p
                    className="mt-1 text-sm text-red-600"
                    id="account-password-error"
                    role="alert"
                  >
                    {errors.password}
                  </p>
                )}
              </div>
              <div>
                <label
                  className="block text-sm font-semibold text-slate-700"
                  htmlFor="account-role"
                >
                  Role
                </label>
                <select
                  aria-describedby={
                    errors.role ? "account-role-error" : undefined
                  }
                  aria-invalid={Boolean(errors.role)}
                  aria-required="true"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
                  id="account-role"
                  name="role"
                  onChange={updateField}
                  value={form.role}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
                {errors.role && (
                  <p
                    className="mt-1 text-sm text-red-600"
                    id="account-role-error"
                    role="alert"
                  >
                    {errors.role}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <button
                  className={
                    "w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium " +
                    "text-white shadow-sm hover:bg-indigo-700 focus:outline-none " +
                    "focus-visible:ring-2 focus-visible:ring-indigo-600 " +
                    "focus-visible:ring-offset-2 sm:w-auto"
                  }
                  type="submit"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}
        </section>

        <section aria-labelledby="accounts-heading" className="mt-10">
          <h2
            className="text-2xl font-bold text-slate-900"
            id="accounts-heading"
          >
            Accounts
          </h2>
          {available && (
            <>
              <div className="mt-5 hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm sm:block">
                <table className="min-w-full text-left">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3" scope="col">
                        Account
                      </th>
                      <th className="px-5 py-3" scope="col">
                        Role
                      </th>
                      <th className="px-5 py-3" scope="col">
                        Created
                      </th>
                      <th className="px-5 py-3 text-right" scope="col">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleUsers.map((user) => {
                      const reason = deletionProtection(user);
                      return (
                        <UserRow
                          deleteDisabled={Boolean(reason)}
                          disabledReason={reason}
                          key={user.id}
                          mode="desktop"
                          onDelete={() => handleDelete(user.id)}
                          user={user}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 space-y-4 sm:hidden">
                {visibleUsers.map((user) => {
                  const reason = deletionProtection(user);
                  return (
                    <UserRow
                      deleteDisabled={Boolean(reason)}
                      disabledReason={reason}
                      key={user.id}
                      mode="mobile"
                      onDelete={() => handleDelete(user.id)}
                      user={user}
                    />
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default UserManagement;
