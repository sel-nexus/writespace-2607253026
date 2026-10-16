/** Verify complete collection validation and resilient browser-storage outcomes. */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getPosts,
  getUsers,
  isValidPost,
  isValidUser,
  readPosts,
  readUsers,
  savePosts,
  saveUsers,
} from "./storage.js";

const VALID_POST = {
  id: "a12f36aa-e52d-4a93-b30a-4f3dd2c6f3ab",
  title: "A small beginning",
  content: "Today I started writing.\nThis is still plain text.",
  createdAt: "2026-03-04T12:00:00.000Z",
  authorId: "8dbd86a0-c472-4707-a142-3d7f38664c57",
  authorName: "Morgan Lee",
};

const VALID_USER = {
  id: "8dbd86a0-c472-4707-a142-3d7f38664c57",
  displayName: "Morgan Lee",
  username: "morgan",
  password: "demo-only-do-not-use",
  role: "user",
  createdAt: "2026-03-04T12:00:00.000Z",
};

beforeEach(() => {
  localStorage.clear();
});

describe("isValidPost", () => {
  it("accepts a complete canonical post, including empty plain-text content", () => {
    expect(isValidPost(VALID_POST)).toBe(true);
    expect(isValidPost({ ...VALID_POST, content: "" })).toBe(true);
  });

  it.each([
    ["null", null],
    ["an array", []],
    ["a primitive", "post"],
    ["a missing id", { ...VALID_POST, id: undefined }],
    ["a malformed UUID", { ...VALID_POST, id: "post-1" }],
    ["an id with non-hex characters", { ...VALID_POST, id: "g12f36aa-e52d-4a93-b30a-4f3dd2c6f3ab" }],
    ["a missing title", { ...VALID_POST, title: undefined }],
    ["a whitespace-only title", { ...VALID_POST, title: "   " }],
    ["non-string content", { ...VALID_POST, content: null }],
    ["a missing timestamp", { ...VALID_POST, createdAt: undefined }],
    ["a parseable but non-canonical timestamp", { ...VALID_POST, createdAt: "2026-03-04T12:00:00Z" }],
    ["an impossible timestamp", { ...VALID_POST, createdAt: "not-a-date" }],
    ["a missing author id", { ...VALID_POST, authorId: undefined }],
    ["a whitespace-only author id", { ...VALID_POST, authorId: "  " }],
    ["a missing author name", { ...VALID_POST, authorName: undefined }],
    ["a whitespace-only author name", { ...VALID_POST, authorName: "\t" }],
  ])("rejects %s", (_label, candidate) => {
    expect(isValidPost(candidate)).toBe(false);
  });
});

describe("isValidUser", () => {
  it.each(["user", "admin"])("accepts a complete user with the %s role", (role) => {
    expect(isValidUser({ ...VALID_USER, role })).toBe(true);
  });

  it.each([
    ["null", null],
    ["an array", []],
    ["a primitive", 3],
    ["a missing id", { ...VALID_USER, id: undefined }],
    ["a malformed UUID", { ...VALID_USER, id: "user-1" }],
    ["a missing display name", { ...VALID_USER, displayName: undefined }],
    ["a whitespace-only display name", { ...VALID_USER, displayName: "  " }],
    ["a missing username", { ...VALID_USER, username: undefined }],
    ["a whitespace-only username", { ...VALID_USER, username: "\n" }],
    ["a missing password", { ...VALID_USER, password: undefined }],
    ["a whitespace-only password", { ...VALID_USER, password: "  " }],
    ["an uppercase role", { ...VALID_USER, role: "User" }],
    ["an unknown role", { ...VALID_USER, role: "editor" }],
    ["a missing timestamp", { ...VALID_USER, createdAt: undefined }],
    ["a parseable but non-canonical timestamp", { ...VALID_USER, createdAt: "2026-03-04" }],
    ["an impossible timestamp", { ...VALID_USER, createdAt: "yesterday" }],
  ])("rejects %s", (_label, candidate) => {
    expect(isValidUser(candidate)).toBe(false);
  });
});

describe.each([
  {
    label: "posts",
    key: "writespace_posts",
    validRecord: VALID_POST,
    read: readPosts,
    get: getPosts,
  },
  {
    label: "users",
    key: "writespace_users",
    validRecord: VALID_USER,
    read: readUsers,
    get: getUsers,
  },
])("$label collection reads", ({ key, validRecord, read, get }) => {
  it("treats a missing key as a valid empty collection", () => {
    expect(read()).toEqual({ data: [], status: "ok" });
    expect(get()).toEqual([]);
  });

  it("returns every member of a valid collection and preserves object values", () => {
    const records = [validRecord, { ...validRecord }];
    localStorage.setItem(key, JSON.stringify(records));

    expect(read()).toEqual({ data: records, status: "ok" });
    expect(get()).toEqual(records);
  });

  it("reports malformed JSON as a parse error without rewriting it", () => {
    localStorage.setItem(key, "{malformed");

    expect(read()).toEqual({ data: [], status: "corrupt", reason: "parse_error" });
    expect(get()).toEqual([]);
    expect(localStorage.getItem(key)).toBe("{malformed");
  });

  it.each([null, {}, "records", 42])("reports the non-array JSON value %p as the wrong shape", (value) => {
    localStorage.setItem(key, JSON.stringify(value));

    expect(read()).toEqual({ data: [], status: "corrupt", reason: "wrong_shape" });
  });

  it("invalidates the whole collection when any member is invalid", () => {
    localStorage.setItem(key, JSON.stringify([validRecord, { ...validRecord, id: "invalid" }]));

    expect(read()).toEqual({ data: [], status: "corrupt", reason: "invalid_record" });
    expect(get()).toEqual([]);
  });

  it("reports blocked storage reads as unavailable", () => {
    vi.spyOn(Object.getPrototypeOf(localStorage), "getItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });

    expect(read()).toEqual({ data: [], status: "unavailable", reason: "access_denied" });
    expect(get()).toEqual([]);
  });
});

describe.each([
  {
    label: "posts",
    key: "writespace_posts",
    validRecord: VALID_POST,
    save: savePosts,
  },
  {
    label: "users",
    key: "writespace_users",
    validRecord: VALID_USER,
    save: saveUsers,
  },
])("$label collection writes", ({ key, validRecord, save }) => {
  it("round-trips a valid complete replacement array", () => {
    expect(save([validRecord])).toBe(true);
    expect(JSON.parse(localStorage.getItem(key))).toEqual([validRecord]);
  });

  it("allows a valid empty replacement array", () => {
    expect(save([])).toBe(true);
    expect(localStorage.getItem(key)).toBe("[]");
  });

  it.each([null, undefined, {}, "records", validRecord])("rejects the non-array input %p without overwriting existing data", (input) => {
    localStorage.setItem(key, "existing");

    expect(save(input)).toBe(false);
    expect(localStorage.getItem(key)).toBe("existing");
  });

  it("rejects an array containing any invalid member without partial persistence", () => {
    localStorage.setItem(key, "existing");

    expect(save([validRecord, { ...validRecord, id: "invalid" }])).toBe(false);
    expect(localStorage.getItem(key)).toBe("existing");
  });

  it("returns false and preserves data when serialization fails", () => {
    localStorage.setItem(key, "existing");
    vi.spyOn(JSON, "stringify").mockImplementation(() => {
      throw new TypeError("Cannot serialize");
    });

    expect(save([validRecord])).toBe(false);
    expect(localStorage.getItem(key)).toBe("existing");
  });

  it("returns false when browser storage rejects the write", () => {
    vi.spyOn(Object.getPrototypeOf(localStorage), "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    expect(save([validRecord])).toBe(false);
  });
});
