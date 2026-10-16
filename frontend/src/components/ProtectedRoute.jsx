import PropTypes from "prop-types";
import { Navigate, Outlet } from "react-router-dom";
import { getSession } from "../utils/auth";

/**
 * Guard authenticated, role-restricted, and guest-only route branches.
 *
 * @param {{children?: JSX.Element, guestOnly?: boolean, requiredRole?: "admin"|"user"}} props - Route access requirements.
 * @returns {JSX.Element} Allowed content or a replacement redirect.
 */
export function ProtectedRoute({ children, guestOnly = false, requiredRole }) {
  const session = getSession();

  if (guestOnly && session) {
    return <Navigate replace to={session.role === "admin" ? "/admin" : "/blogs"} />;
  }

  if (!guestOnly && !session) {
    return <Navigate replace to="/login" />;
  }

  if (requiredRole && session?.role !== requiredRole) {
    return <Navigate replace to="/blogs" />;
  }

  return children || <Outlet />;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node,
  guestOnly: PropTypes.bool,
  requiredRole: PropTypes.oneOf(["admin", "user"]),
};

export default ProtectedRoute;
