import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { setSession } from "../utils/auth";
import { readUsers, saveUsers } from "../utils/storage";

/** Translate a failed user collection read into actionable local recovery copy. */
function getReadWarning(status) {
  return status === "corrupt"
    ? "Saved user data is corrupted and cannot be used. Inspect or clear this browser’s local data, then try again."
    : "Local browser data is unavailable. Check your browser storage settings and try again.";
}

/** Render local demo account registration and persist account before session. */
export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ displayName: "", username: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  /** Update one stable controlled registration field. */
  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  /** Validate, save the account, then establish a session without claiming atomicity. */
  function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    const nextErrors = {};
    if (!form.displayName.trim()) nextErrors.displayName = "Display Name is required.";
    if (!form.username.trim()) nextErrors.username = "Username is required.";
    if (!form.password) nextErrors.password = "Password is required.";
    if (!form.confirmPassword) nextErrors.confirmPassword = "Confirm Password is required.";
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    const result = readUsers();
    if (result.status !== "ok") {
      setErrors(nextErrors);
      setFormError(getReadWarning(result.status));
      return;
    }

    if (form.username.trim() === "admin" || result.data.some((user) => user.username === form.username.trim())) {
      nextErrors.username = "Username is already taken.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    let id;
    try {
      if (typeof globalThis.crypto?.randomUUID !== "function") throw new Error("unsupported");
      id = globalThis.crypto.randomUUID();
    } catch {
      setFormError("Your browser does not support secure account IDs. Use a modern browser and try again.");
      return;
    }

    const user = {
      id,
      displayName: form.displayName.trim(),
      username: form.username.trim(),
      password: form.password,
      role: "user",
      createdAt: new Date().toISOString(),
    };

    if (!saveUsers([...result.data, user])) {
      setFormError(
        "Registration could not be saved. Your account was not created. " +
          "Browser storage may be blocked or full; check site storage permissions or free space, then retry.",
      );
      return;
    }

    const session = {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    };
    if (!setSession(session)) {
      setFormError("Your account was created locally, but sign-in did not complete. Please log in.");
      return;
    }
    navigate("/blogs", { replace: true });
  }

  const fields = [
    { name: "displayName", label: "Display Name", type: "text", autoComplete: "name" },
    { name: "username", label: "Username", type: "text", autoComplete: "username" },
    { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
    { name: "confirmPassword", label: "Confirm Password", type: "password", autoComplete: "new-password" },
  ];

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-600 via-violet-600 to-pink-500 px-4 py-12">
      <section aria-labelledby="register-heading" className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl sm:p-9">
        <Link className="inline-block rounded-md text-xl font-extrabold tracking-tight text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" to="/">
          Write<span className="text-indigo-600">Space</span>
        </Link>
        <h1 className="mt-7 text-3xl font-extrabold tracking-tight text-slate-900" id="register-heading">Create your space</h1>
        <p className="mt-2 text-slate-600">Make a local demo account and start writing.</p>

        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-900" role="note">
          <strong>Demo only:</strong> Passwords are stored as plaintext in this browser. Do not use a real password or sensitive data.
        </div>

        {formError && (
          <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700" id="register-form-error" role="alert">
            {formError}
          </p>
        )}

        <form aria-describedby={formError ? "register-form-error" : undefined} className="mt-6 space-y-4" noValidate onSubmit={handleSubmit}>
          {fields.map((field) => {
            const errorId = `register-${field.name}-error`;
            return (
              <div key={field.name}>
                <label className="block text-sm font-semibold text-slate-700" htmlFor={`register-${field.name}`}>{field.label}</label>
                <input
                  aria-describedby={errors[field.name] ? errorId : undefined}
                  aria-invalid={Boolean(errors[field.name])}
                  aria-required="true"
                  autoComplete={field.autoComplete}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
                  id={`register-${field.name}`}
                  name={field.name}
                  onChange={updateField}
                  type={field.type}
                  value={form[field.name]}
                />
                {errors[field.name] && <p className="mt-1 text-sm text-red-600" id={errorId} role="alert">{errors[field.name]}</p>}
              </div>
            );
          })}
          <button className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2" type="submit">
            Register
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already registered? <Link className="font-semibold text-indigo-700 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" to="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}

export default RegisterPage;
