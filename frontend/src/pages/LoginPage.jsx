import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { setSession } from "../utils/auth";
import { readUsers } from "../utils/storage";

const ADMIN_SESSION = {
  userId: "admin",
  username: "admin",
  displayName: "Admin",
  role: "admin",
};

/** Translate a failed user collection read into actionable local recovery copy. */
function getReadWarning(status) {
  return status === "corrupt"
    ? "Saved user data is corrupted and cannot be used. Inspect or clear this browser’s local data, then try again."
    : "Local browser data is unavailable. Check your browser storage settings and try again.";
}

/** Render the guest login form and establish validated local demo sessions. */
export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  /** Validate credentials, persist the canonical session, and route by role. */
  function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    const nextErrors = {};
    if (!username.trim()) nextErrors.username = "Username is required.";
    if (!password) nextErrors.password = "Password is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    let session;
    if (username === "admin" && password === "admin") {
      session = ADMIN_SESSION;
    } else {
      const result = readUsers();
      if (result.status !== "ok") {
        setFormError(getReadWarning(result.status));
        return;
      }
      const user = result.data.find((candidate) => candidate.username === username && candidate.password === password);
      if (!user) {
        setFormError("Invalid username or password.");
        return;
      }
      session = {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      };
    }

    if (!setSession(session)) {
      setFormError("Sign-in could not be completed because the local session could not be saved.");
      return;
    }
    navigate(session.role === "admin" ? "/admin" : "/blogs", { replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-600 via-violet-600 to-pink-500 px-4 py-12">
      <section aria-labelledby="login-heading" className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl sm:p-9">
        <Link className="inline-block rounded-md text-xl font-extrabold tracking-tight text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" to="/">
          Write<span className="text-indigo-600">Space</span>
        </Link>
        <h1 className="mt-7 text-3xl font-extrabold tracking-tight text-slate-900" id="login-heading">Welcome back</h1>
        <p className="mt-2 text-slate-600">Log in to keep reading and writing in this browser.</p>

        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-900" role="note">
          <strong>Demo only:</strong> Passwords are stored as plaintext in this browser. Do not use a real password or sensitive data.
        </div>

        {formError && (
          <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700" id="login-form-error" role="alert">
            {formError}
          </p>
        )}

        <form aria-describedby={formError ? "login-form-error" : undefined} className="mt-6 space-y-5" noValidate onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="login-username">Username</label>
            <input
              aria-describedby={errors.username ? "login-username-error" : undefined}
              aria-invalid={Boolean(errors.username)}
              aria-required="true"
              autoComplete="username"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
              id="login-username"
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              type="text"
              value={username}
            />
            {errors.username && <p className="mt-1 text-sm text-red-600" id="login-username-error" role="alert">{errors.username}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="login-password">Password</label>
            <input
              aria-describedby={errors.password ? "login-password-error" : undefined}
              aria-invalid={Boolean(errors.password)}
              aria-required="true"
              autoComplete="current-password"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
              id="login-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
            {errors.password && <p className="mt-1 text-sm text-red-600" id="login-password-error" role="alert">{errors.password}</p>}
          </div>
          <button className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2" type="submit">
            Login
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Need an account? <Link className="font-semibold text-indigo-700 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" to="/register">Register</Link>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
