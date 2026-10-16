import PropTypes from "prop-types";
import { useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "./Avatar";

/**
 * Render public discovery navigation with responsive guest or session actions.
 *
 * @param {{session: {displayName: string, role: "admin"|"user"}|null}} props - Current validated browser-local session.
 * @returns {JSX.Element} Sticky responsive public navigation.
 */
export function PublicNavbar({ session }) {
  const [isOpen, setIsOpen] = useState(false);
  const dashboardPath = session?.role === "admin" ? "/admin" : "/blogs";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white shadow-sm">
      <nav
        aria-label="Public navigation"
        className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"
      >
        <div className="flex h-16 items-center justify-between">
          <Link
            className={
              "rounded-md text-xl font-extrabold tracking-tight text-slate-900 " +
              "focus:outline-none focus-visible:ring-2 " +
              "focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            }
            to="/"
          >
            Write<span className="text-indigo-600">Space</span>
          </Link>

          <div className="hidden items-center gap-3 sm:flex">
            {session ? (
              <>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Avatar role={session.role} />
                  <span>{session.displayName}</span>
                </div>
                <Link
                  className={
                    "rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white " +
                    "shadow-sm hover:bg-indigo-700 focus:outline-none " +
                    "focus-visible:ring-2 focus-visible:ring-indigo-600 " +
                    "focus-visible:ring-offset-2"
                  }
                  to={dashboardPath}
                >
                  Go to Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  className={
                    "rounded-lg px-4 py-2 font-medium text-slate-700 " +
                    "hover:bg-slate-100 focus:outline-none focus-visible:ring-2 " +
                    "focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                  }
                  to="/login"
                >
                  Login
                </Link>
                <Link
                  className={
                    "rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white " +
                    "shadow-sm hover:bg-indigo-700 focus:outline-none " +
                    "focus-visible:ring-2 focus-visible:ring-indigo-600 " +
                    "focus-visible:ring-offset-2"
                  }
                  to="/register"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button
            aria-controls="public-mobile-menu"
            aria-expanded={isOpen}
            aria-label="Toggle navigation menu"
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 sm:hidden"
            onClick={() => setIsOpen((open) => !open)}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d={isOpen ? "M6 18 18 6M6 6l12 12" : "M4 7h16M4 12h16M4 17h16"}
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
              />
            </svg>
          </button>
        </div>

        {isOpen && (
          <div
            className="space-y-2 border-t border-slate-100 py-3 sm:hidden"
            id="public-mobile-menu"
          >
            {session ? (
              <>
                <div className="flex items-center gap-2 px-2 py-2 text-sm font-medium text-slate-700">
                  <Avatar role={session.role} />
                  <span>{session.displayName}</span>
                </div>
                <Link
                  className="block rounded-lg bg-indigo-600 px-4 py-2 text-center font-medium text-white"
                  onClick={() => setIsOpen(false)}
                  to={dashboardPath}
                >
                  Go to Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  className="block rounded-lg px-4 py-2 text-center font-medium text-slate-700 hover:bg-slate-100"
                  onClick={() => setIsOpen(false)}
                  to="/login"
                >
                  Login
                </Link>
                <Link
                  className="block rounded-lg bg-indigo-600 px-4 py-2 text-center font-medium text-white"
                  onClick={() => setIsOpen(false)}
                  to="/register"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}

PublicNavbar.propTypes = {
  session: PropTypes.shape({
    displayName: PropTypes.string.isRequired,
    role: PropTypes.oneOf(["admin", "user"]).isRequired,
  }),
};

export default PublicNavbar;
