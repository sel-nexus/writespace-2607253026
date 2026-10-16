import PropTypes from "prop-types";

/** Render the role-specific WriteSpace emoji avatar required by the product design. */

const avatarStyles = {
  admin: "bg-violet-600",
  user: "bg-indigo-500",
};

/**
 * Return static avatar JSX for a persisted role.
 *
 * @param {"admin"|"user"} role - Persisted lower-case account role.
 * @returns {JSX.Element} Accessible emoji avatar markup.
 */
export function getAvatar(role) {
  const isAdmin = role === "admin";

  return (
    <span
      aria-label={isAdmin ? "Admin avatar" : "User avatar"}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg shadow-sm ${avatarStyles[isAdmin ? "admin" : "user"]}`}
      role="img"
    >
      {isAdmin ? "👑" : "📖"}
    </span>
  );
}

/**
 * Display the role-specific WriteSpace avatar.
 *
 * @param {{role: "admin"|"user"}} props - Avatar presentation properties.
 * @returns {JSX.Element} Accessible role avatar.
 */
export function Avatar({ role }) {
  return getAvatar(role);
}

Avatar.propTypes = {
  role: PropTypes.oneOf(["admin", "user"]).isRequired,
};

export default Avatar;
