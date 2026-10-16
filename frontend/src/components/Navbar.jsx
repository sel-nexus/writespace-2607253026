import PropTypes from "prop-types";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { clearSession } from "../utils/auth";
import Avatar from "./Avatar";

const navClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
    isActive
      ? "bg-indigo-100 text-indigo-700"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

/**
 * Render authenticated navigation, responsive menu, identity, and safe logout.
 *
 * @param {{session: {displayName: string, role: "admin"|"user"}}} props - Current validated session.
 * @returns {JSX.Element} Authenticated application navigation.
 */
export function Navbar({ session }) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const homePath = session.role === "admin" ? "/admin" : "/blogs";

  /** Clear only the local session and return to public discovery after success. */
  function handleLogout() {
    setLogoutError("");
    if (!clearSession()) {
      setLogoutError(
        "Logout could not be completed because browser storage is unavailable.",
      );
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white shadow-sm">
      <nav
        aria-label="Authenticated navigation"
        className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"
      >
        <div className="flex h-16 items-center justify-between">
          <Link
            className="rounded-md text-xl font-extrabold tracking-tight text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            to="/"
          >
            Write<span className="text-indigo-600">Space</span>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <NavLink className={navClass} to={homePath}>
              Dashboard
            </NavLink>
            <NavLink className={navClass} to="/blogs">
              All Blogs
            </NavLink>
            <NavLink className={navClass} to="/write">
              Write
            </NavLink>
          </div>

          <div className="hidden md:block">
            <button
              aria-expanded={isAccountOpen}
              aria-haspopup="menu"
              className={
                "flex items-center gap-2 rounded-lg p-1 pr-3 text-sm font-medium " +
                "text-slate-700 hover:bg-slate-100 focus:outline-none " +
                "focus-visible:ring-2 focus-visible:ring-indigo-600"
              }
              onClick={() => setIsAccountOpen((open) => !open)}
              type="button"
            >
              <Avatar role={session.role} />
              <span>{session.displayName}</span>
            </button>
            {isAccountOpen && (
              <div
                className="absolute right-4 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
                role="menu"
              >
                <button
                  className={
                    "w-full rounded-lg px-3 py-2 text-left text-sm font-medium " +
                    "text-red-600 hover:bg-red-50 focus:outline-none " +
                    "focus-visible:ring-2 focus-visible:ring-red-600"
                  }
                  onClick={handleLogout}
                  role="menuitem"
                  type="button"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          <button
            aria-controls="authenticated-mobile-menu"
            aria-expanded={isMenuOpen}
            aria-label="Toggle navigation menu"
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 md:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d={
                  isMenuOpen
                    ? "M6 18 18 6M6 6l12 12"
                    : "M4 7h16M4 12h16M4 17h16"
                }
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
              />
            </svg>
          </button>
        </div>

        {isMenuOpen && (
          <div
            className="space-y-2 border-t border-slate-100 py-3 md:hidden"
            id="authenticated-mobile-menu"
          >
            <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700">
              <Avatar role={session.role} />
              <span>{session.displayName}</span>
            </div>
            <NavLink
              className={navClass}
              onClick={() => setIsMenuOpen(false)}
              to={homePath}
            >
              Dashboard
            </NavLink>
            <NavLink
              className={navClass}
              onClick={() => setIsMenuOpen(false)}
              to="/blogs"
            >
              All Blogs
            </NavLink>
            <NavLink
              className={navClass}
              onClick={() => setIsMenuOpen(false)}
              to="/write"
            >
              Write
            </NavLink>
            <button
              className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              onClick={handleLogout}
              type="button"
            >
              Logout
            </button>
          </div>
        )}
        {logoutError && (
          <p className="pb-3 text-sm font-medium text-red-600" role="alert">
            {logoutError}
          </p>
        )}
      </nav>
    </header>
  );
}

Navbar.propTypes = {
  session: PropTypes.shape({
    displayName: PropTypes.string.isRequired,
    role: PropTypes.oneOf(["admin", "user"]).isRequired,
  }).isRequired,
};

export default Navbar;
