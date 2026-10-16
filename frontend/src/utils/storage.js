/**
 * Centralize validated access to WriteSpace post and user collections.
 *
 * Notes:
 *   Browser storage is user-controlled and may be unavailable or corrupt. These
 *   helpers never expose partially valid collections and never throw storage
 *   errors to rendering callers. Passwords are plaintext by product constraint;
 *   this demo must never be used for real credentials or sensitive data.
 */

/** @typedef {{id: string, title: string, content: string, createdAt: string, authorId: string, authorName: string}} Post */
/** @typedef {{id: string, displayName: string, username: string, password: string, role: "admin"|"user", createdAt: string}} User */
/** @typedef {"parse_error"|"wrong_shape"|"invalid_record"|"access_denied"} ReadFailureReason */
/** @typedef {{data: Array<*>, status: "ok"|"corrupt"|"unavailable", reason?: ReadFailureReason}} ReadResult */

const POSTS_KEY = "writespace_posts";
const USERS_KEY = "writespace_users";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Determine whether a value is a plain record-like object.
 *
 * @param {*} value - Candidate value from parsed browser storage.
 * @returns {boolean} True for non-null objects that are not arrays.
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Determine whether a value is a non-empty string after trimming.
 *
 * @param {*} value - Candidate text value.
 * @returns {boolean} True when meaningful text remains after trimming.
 */
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Determine whether a value uses the UUID text format required for generated IDs.
 *
 * @param {*} value - Candidate identifier.
 * @returns {boolean} True when the value has the canonical UUID segment layout.
 */
function isUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/**
 * Determine whether a value is the canonical UTC ISO form emitted by toISOString.
 *
 * @param {*} value - Candidate timestamp.
 * @returns {boolean} True when the timestamp parses and round-trips canonically.
 */
function isCanonicalIso(value) {
  if (typeof value !== "string") {
    return false;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

/**
 * Validate a persisted post record without coercing any field.
 *
 * @param {*} value - Candidate post from browser storage.
 * @returns {boolean} True only when every required post field is valid.
 */
export function isValidPost(value) {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    isNonEmptyString(value.title) &&
    typeof value.content === "string" &&
    isCanonicalIso(value.createdAt) &&
    isNonEmptyString(value.authorId) &&
    isNonEmptyString(value.authorName)
  );
}

/**
 * Validate a persisted user record without coercing any field.
 *
 * @param {*} value - Candidate user from browser storage.
 * @returns {boolean} True only when every required user field is valid.
 *
 * Notes:
 *   Password validation enforces only the local demo schema. Password values are
 *   intentionally plaintext and must not be real credentials.
 */
export function isValidUser(value) {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    isNonEmptyString(value.displayName) &&
    isNonEmptyString(value.username) &&
    isNonEmptyString(value.password) &&
    (value.role === "admin" || value.role === "user") &&
    isCanonicalIso(value.createdAt)
  );
}

/**
 * Read and validate one complete collection from browser storage.
 *
 * @param {string} key - Storage key owned by this module.
 * @param {(value: *) => boolean} validator - Record-level validation predicate.
 * @returns {ReadResult} Status-bearing data with no partial collection on failure.
 */
function readCollection(key, validator) {
  let serialized;

  try {
    serialized = globalThis.localStorage.getItem(key);
  } catch {
    return { data: [], status: "unavailable", reason: "access_denied" };
  }

  if (serialized === null) {
    return { data: [], status: "ok" };
  }

  let parsed;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return { data: [], status: "corrupt", reason: "parse_error" };
  }

  if (!Array.isArray(parsed)) {
    return { data: [], status: "corrupt", reason: "wrong_shape" };
  }

  try {
    if (!parsed.every(validator)) {
      return { data: [], status: "corrupt", reason: "invalid_record" };
    }
  } catch {
    return { data: [], status: "corrupt", reason: "invalid_record" };
  }

  return { data: parsed, status: "ok" };
}

/**
 * Serialize and persist one validated complete replacement collection.
 *
 * @param {string} key - Storage key owned by this module.
 * @param {*} values - Candidate replacement collection.
 * @param {(value: *) => boolean} validator - Record-level validation predicate.
 * @returns {boolean} True only after validation, serialization, and storage finish.
 */
function saveCollection(key, values, validator) {
  try {
    if (!Array.isArray(values) || !values.every(validator)) {
      return false;
    }

    const serialized = JSON.stringify(values);
    globalThis.localStorage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the complete persisted post collection with failure status.
 *
 * @returns {ReadResult} Valid posts or an empty status-bearing failure result.
 */
export function readPosts() {
  return readCollection(POSTS_KEY, isValidPost);
}

/**
 * Read posts through the compatibility array-only interface.
 *
 * @returns {Post[]} Valid posts, or an empty array for absent or unreadable data.
 */
export function getPosts() {
  return /** @type {Post[]} */ (readPosts().data);
}

/**
 * Validate and persist a complete replacement post collection.
 *
 * @param {Post[]} posts - Complete next post collection.
 * @returns {boolean} True only when the complete collection was committed.
 */
export function savePosts(posts) {
  return saveCollection(POSTS_KEY, posts, isValidPost);
}

/**
 * Read the complete persisted user collection with failure status.
 *
 * @returns {ReadResult} Valid users or an empty status-bearing failure result.
 */
export function readUsers() {
  return readCollection(USERS_KEY, isValidUser);
}

/**
 * Read users through the compatibility array-only interface.
 *
 * @returns {User[]} Valid users, or an empty array for absent or unreadable data.
 */
export function getUsers() {
  return /** @type {User[]} */ (readUsers().data);
}

/**
 * Validate and persist a complete replacement user collection.
 *
 * @param {User[]} users - Complete next user collection.
 * @returns {boolean} True only when the complete collection was committed.
 */
export function saveUsers(users) {
  return saveCollection(USERS_KEY, users, isValidUser);
}
