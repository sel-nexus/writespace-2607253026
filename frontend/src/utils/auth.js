/**
 * Centralize validated access to the WriteSpace browser-local session.
 *
 * Notes:
 *   This client-controlled session is a demo workflow aid, not a security
 *   boundary. The built-in credentials and local user passwords are plaintext;
 *   never use real credentials or sensitive data in WriteSpace.
 */

/** @typedef {{userId: string, username: string, displayName: string, role: "admin"|"user"}} Session */

const SESSION_KEY = "writespace_session";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Determine whether a value is a non-array object.
 *
 * @param {*} value - Candidate parsed session value.
 * @returns {boolean} True for non-null objects that are not arrays.
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Determine whether a value is a non-empty string after trimming.
 *
 * @param {*} value - Candidate session field.
 * @returns {boolean} True when meaningful text remains after trimming.
 */
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validate the exact built-in administrator or a UUID-backed local session.
 *
 * @param {*} value - Candidate session object.
 * @returns {boolean} True only for the canonical built-in tuple or a valid local identity.
 *
 * Notes:
 *   UUID-backed identities may have role admin or user because an administrator
 *   can create local accounts with either role. A non-UUID admin identity cannot
 *   imitate the built-in administrator with a partial tuple.
 */
export function isValidSession(value) {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.userId) ||
    !isNonEmptyString(value.username) ||
    !isNonEmptyString(value.displayName) ||
    (value.role !== "admin" && value.role !== "user")
  ) {
    return false;
  }

  const isBuiltInAdmin =
    value.userId === "admin" &&
    value.username === "admin" &&
    value.displayName === "Admin" &&
    value.role === "admin";

  return isBuiltInAdmin || UUID_PATTERN.test(value.userId);
}

/**
 * Read and validate the current browser-local session.
 *
 * @returns {Session|null} The valid session, or null when absent or unreadable.
 */
export function getSession() {
  try {
    const serialized = globalThis.localStorage.getItem(SESSION_KEY);
    if (serialized === null) {
      return null;
    }

    const parsed = JSON.parse(serialized);
    return isValidSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Validate and persist the complete browser-local session.
 *
 * @param {Session} session - Canonical session to persist.
 * @returns {boolean} True only after validation, serialization, and storage finish.
 */
export function setSession(session) {
  try {
    if (!isValidSession(session)) {
      return false;
    }

    const serialized = JSON.stringify(session);
    globalThis.localStorage.setItem(SESSION_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove the browser-local session without clearing unrelated application data.
 *
 * @returns {boolean} True only when the storage removal operation completes.
 */
export function clearSession() {
  try {
    globalThis.localStorage.removeItem(SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}
