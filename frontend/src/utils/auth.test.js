/** Verify strict session identity validation and resilient session persistence. */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearSession, getSession, isValidSession, setSession } from "./auth.js";

const BUILT_IN_ADMIN = {
  userId: "admin",
  username: "admin",
  displayName: "Admin",
  role: "admin",
};

const VALID_USER_SESSION = {
  userId: "8dbd86a0-c472-4707-a142-3d7f38664c57",
  username: "morgan",
  displayName: "Morgan Lee",
  role: "user",
};

beforeEach(() => {
  localStorage.clear();
});

describe("isValidSession", () => {
  it("accepts only the exact built-in administrator tuple for a non-UUID identity", () => {
    expect(isValidSession(BUILT_IN_ADMIN)).toBe(true);
  });

  it.each([
    ["userId", "administrator"],
    ["username", "Admin"],
    ["displayName", "admin"],
    ["role", "user"],
  ])("rejects the built-in tuple when %s differs", (field, value) => {
    expect(isValidSession({ ...BUILT_IN_ADMIN, [field]: value })).toBe(false);
  });

  it.each(["user", "admin"])("accepts a UUID-backed local identity with the %s role", (role) => {
    expect(isValidSession({ ...VALID_USER_SESSION, role })).toBe(true);
  });

  it.each([
    ["null", null],
    ["an array", []],
    ["a primitive", "session"],
    ["a missing user id", { ...VALID_USER_SESSION, userId: undefined }],
    ["a whitespace-only user id", { ...VALID_USER_SESSION, userId: "  " }],
    ["a malformed non-built-in user id", { ...VALID_USER_SESSION, userId: "user-1" }],
    ["a UUID containing non-hex text", { ...VALID_USER_SESSION, userId: "gdbd86a0-c472-4707-a142-3d7f38664c57" }],
    ["a missing username", { ...VALID_USER_SESSION, username: undefined }],
    ["a whitespace-only username", { ...VALID_USER_SESSION, username: "\t" }],
    ["a missing display name", { ...VALID_USER_SESSION, displayName: undefined }],
    ["a whitespace-only display name", { ...VALID_USER_SESSION, displayName: "\n" }],
    ["a missing role", { ...VALID_USER_SESSION, role: undefined }],
    ["an uppercase role", { ...VALID_USER_SESSION, role: "User" }],
    ["an unknown role", { ...VALID_USER_SESSION, role: "editor" }],
  ])("rejects %s", (_label, candidate) => {
    expect(isValidSession(candidate)).toBe(false);
  });
});

describe("getSession", () => {
  it("returns null when the session key is absent", () => {
    expect(getSession()).toBeNull();
  });

  it("returns the exact valid parsed session", () => {
    localStorage.setItem("writespace_session", JSON.stringify(VALID_USER_SESSION));

    expect(getSession()).toEqual(VALID_USER_SESSION);
  });

  it("returns null for malformed JSON", () => {
    localStorage.setItem("writespace_session", "{malformed");

    expect(getSession()).toBeNull();
  });

  it.each([null, [], {}, "session", { ...VALID_USER_SESSION, role: "owner" }])("returns null for the invalid parsed value %p", (value) => {
    localStorage.setItem("writespace_session", JSON.stringify(value));

    expect(getSession()).toBeNull();
  });

  it("returns null when browser storage access is blocked", () => {
    vi.spyOn(Object.getPrototypeOf(localStorage), "getItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });

    expect(getSession()).toBeNull();
  });
});

describe("setSession", () => {
  it.each([VALID_USER_SESSION, BUILT_IN_ADMIN])("round-trips the valid session %p", (session) => {
    expect(setSession(session)).toBe(true);
    expect(getSession()).toEqual(session);
  });

  it("rejects an invalid session without overwriting the active session", () => {
    localStorage.setItem("writespace_session", JSON.stringify(VALID_USER_SESSION));

    expect(setSession({ ...VALID_USER_SESSION, role: "owner" })).toBe(false);
    expect(getSession()).toEqual(VALID_USER_SESSION);
  });

  it("returns false and preserves the current session when serialization fails", () => {
    localStorage.setItem("writespace_session", JSON.stringify(VALID_USER_SESSION));
    vi.spyOn(JSON, "stringify").mockImplementation(() => {
      throw new TypeError("Cannot serialize");
    });

    expect(setSession(BUILT_IN_ADMIN)).toBe(false);
    expect(localStorage.getItem("writespace_session")).toContain("morgan");
  });

  it("returns false when browser storage rejects the write", () => {
    vi.spyOn(Object.getPrototypeOf(localStorage), "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    expect(setSession(VALID_USER_SESSION)).toBe(false);
  });
});

describe("clearSession", () => {
  it("removes only the session key and reports success", () => {
    localStorage.setItem("writespace_session", JSON.stringify(VALID_USER_SESSION));
    localStorage.setItem("writespace_posts", "[]");

    expect(clearSession()).toBe(true);
    expect(localStorage.getItem("writespace_session")).toBeNull();
    expect(localStorage.getItem("writespace_posts")).toBe("[]");
  });

  it("is idempotent when the session key is already absent", () => {
    expect(clearSession()).toBe(true);
    expect(getSession()).toBeNull();
  });

  it("returns false when browser storage rejects session removal", () => {
    vi.spyOn(Object.getPrototypeOf(localStorage), "removeItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });

    expect(clearSession()).toBe(false);
  });
});
