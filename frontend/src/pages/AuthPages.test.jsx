import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

const USER_ID = "8dbd86a0-c472-4707-a142-3d7f38664c57";
const NEW_ID = "a12f36aa-e52d-4a93-b30a-4f3dd2c6f3ab";
const createdAt = "2026-03-04T12:00:00.000Z";

function renderRoute(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function seedUser(overrides = {}) {
  const user = {
    id: USER_ID,
    displayName: "Morgan Lee",
    username: "morgan",
    password: "demo-password",
    role: "user",
    createdAt,
    ...overrides,
  };
  localStorage.setItem("writespace_users", JSON.stringify([user]));
  return user;
}

async function completeRegistration(user, values = {}) {
  await user.type(screen.getByLabelText("Display Name"), values.displayName ?? "Taylor Reed");
  await user.type(screen.getByLabelText("Username"), values.username ?? "taylor");
  await user.type(screen.getByLabelText("Password", { exact: true }), values.password ?? "local-demo");
  await user.type(screen.getByLabelText("Confirm Password"), values.confirmPassword ?? "local-demo");
  await user.click(screen.getByRole("button", { name: "Register" }));
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(NEW_ID);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("LoginPage", () => {
  it("renders exact fields, account link, and plaintext demo warning", () => {
    renderRoute("/login");

    expect(screen.getByLabelText("Username")).toHaveAttribute("name", "username");
    expect(screen.getByLabelText("Password")).toHaveAttribute("name", "password");
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute("href", "/register");
    expect(screen.getByText(/Passwords are stored as plaintext in this browser/)).toBeVisible();
  });

  it("associates required field alerts with both controls", async () => {
    const user = userEvent.setup();
    renderRoute("/login");

    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByText("Username is required.")).toHaveAttribute("id", "login-username-error");
    expect(screen.getByText("Password is required.")).toHaveAttribute("id", "login-password-error");
    expect(screen.getByLabelText("Username")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
  });

  it("authenticates the exact built-in admin tuple even when users are corrupt", async () => {
    const user = userEvent.setup();
    localStorage.setItem("writespace_users", "not-json");
    renderRoute("/login");

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "admin");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => expect(screen.getByText("Admin")).toBeVisible());
    expect(JSON.parse(localStorage.getItem("writespace_session"))).toEqual({
      userId: "admin",
      username: "admin",
      displayName: "Admin",
      role: "admin",
    });
  });

  it("rejects near-miss admin credentials without disclosing the username", async () => {
    const user = userEvent.setup();
    renderRoute("/login");

    await user.type(screen.getByLabelText("Username"), "Admin");
    await user.type(screen.getByLabelText("Password"), "admin");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Invalid username or password.");
    expect(localStorage.getItem("writespace_session")).toBeNull();
  });

  it("authenticates a stored user only from a valid user collection", async () => {
    const user = userEvent.setup();
    seedUser();
    renderRoute("/login");

    await user.type(screen.getByLabelText("Username"), "morgan");
    await user.type(screen.getByLabelText("Password"), "demo-password");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => expect(screen.getByText("Morgan Lee")).toBeVisible());
    expect(JSON.parse(localStorage.getItem("writespace_session"))).toMatchObject({ userId: USER_ID, role: "user" });
  });

  it("blocks stored credential matching when user data is corrupt", async () => {
    const user = userEvent.setup();
    localStorage.setItem("writespace_users", "{");
    renderRoute("/login");

    await user.type(screen.getByLabelText("Username"), "morgan");
    await user.type(screen.getByLabelText("Password"), "demo-password");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Saved user data is corrupted and cannot be used.");
    expect(localStorage.getItem("writespace_session")).toBeNull();
  });

  it("stays signed out and reports a session write failure", async () => {
    const user = userEvent.setup();
    const storagePrototype = Object.getPrototypeOf(localStorage);
    const originalSetItem = storagePrototype.setItem;
    vi.spyOn(storagePrototype, "setItem").mockImplementation(function setItem(key, value) {
      if (key === "writespace_session") throw new DOMException("blocked");
      return originalSetItem.call(this, key, value);
    });
    renderRoute("/login");

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "admin");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByRole("alert")).toHaveTextContent("local session could not be saved");
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });
});

describe("RegisterPage", () => {
  it("renders exact fields, login link, and plaintext demo warning", () => {
    renderRoute("/register");

    for (const label of ["Display Name", "Username", "Password", "Confirm Password"]) {
      expect(screen.getByLabelText(label, { exact: true })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");
    expect(screen.getByText(/Do not use a real password or sensitive data/)).toBeVisible();
  });

  it("shows required and password mismatch validation without persistence", async () => {
    const user = userEvent.setup();
    renderRoute("/register");

    await user.click(screen.getByRole("button", { name: "Register" }));
    expect(screen.getAllByRole("alert")).toHaveLength(4);

    await user.type(screen.getByLabelText("Display Name"), "Taylor");
    await user.type(screen.getByLabelText("Username"), "taylor");
    await user.type(screen.getByLabelText("Password", { exact: true }), "one");
    await user.type(screen.getByLabelText("Confirm Password"), "two");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(screen.getByText("Passwords do not match.")).toBeVisible();
    expect(localStorage.getItem("writespace_users")).toBeNull();
  });

  it("enforces exact case-sensitive uniqueness including built-in admin", async () => {
    const user = userEvent.setup();
    seedUser();
    renderRoute("/register");

    await completeRegistration(user, { username: "morgan" });
    expect(screen.getByText("Username is already taken.")).toBeVisible();

    await user.clear(screen.getByLabelText("Username"));
    await user.type(screen.getByLabelText("Username"), "admin");
    await user.click(screen.getByRole("button", { name: "Register" }));
    expect(screen.getByText("Username is already taken.")).toBeVisible();
  });

  it("allows a differently cased username and persists UUID, ISO time, user role, then session", async () => {
    const user = userEvent.setup();
    seedUser();
    renderRoute("/register");

    await completeRegistration(user, { username: "Morgan" });

    await waitFor(() => expect(screen.getByText("Taylor Reed")).toBeVisible());
    const users = JSON.parse(localStorage.getItem("writespace_users"));
    expect(users).toHaveLength(2);
    expect(users[1]).toMatchObject({ id: NEW_ID, username: "Morgan", role: "user" });
    expect(new Date(users[1].createdAt).toISOString()).toBe(users[1].createdAt);
    expect(JSON.parse(localStorage.getItem("writespace_session"))).toEqual({
      userId: NEW_ID,
      username: "Morgan",
      displayName: "Taylor Reed",
      role: "user",
    });
  });

  it("blocks registration when the existing registry is corrupt", async () => {
    const user = userEvent.setup();
    localStorage.setItem("writespace_users", "bad-json");
    renderRoute("/register");

    await completeRegistration(user);

    expect(screen.getByRole("alert")).toHaveTextContent("Saved user data is corrupted and cannot be used.");
    expect(localStorage.getItem("writespace_users")).toBe("bad-json");
  });

  it("reports an unsupported UUID API without writing", async () => {
    const user = userEvent.setup();
    globalThis.crypto.randomUUID.mockImplementation(() => {
      throw new Error("unsupported");
    });
    renderRoute("/register");

    await completeRegistration(user);

    expect(screen.getByRole("alert")).toHaveTextContent("does not support secure account IDs");
    expect(localStorage.getItem("writespace_users")).toBeNull();
  });

  it("does not create an account when the users write fails", async () => {
    const user = userEvent.setup();
    const storagePrototype = Object.getPrototypeOf(localStorage);
    vi.spyOn(storagePrototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota");
    });
    renderRoute("/register");

    await completeRegistration(user);

    expect(screen.getByRole("alert")).toHaveTextContent("Registration could not be saved. Your account was not created.");
    expect(screen.getByRole("alert")).toHaveTextContent("Browser storage may be blocked or full");
    expect(screen.getByRole("heading", { name: "Create your space" })).toBeVisible();
  });

  it("reports distinct partial success when account save succeeds but session save fails", async () => {
    const user = userEvent.setup();
    const storagePrototype = Object.getPrototypeOf(localStorage);
    const originalSetItem = storagePrototype.setItem;
    vi.spyOn(storagePrototype, "setItem").mockImplementation(function setItem(key, value) {
      if (key === "writespace_session") throw new DOMException("blocked");
      return originalSetItem.call(this, key, value);
    });
    renderRoute("/register");

    await completeRegistration(user);

    expect(screen.getByRole("alert")).toHaveTextContent("Your account was created locally, but sign-in did not complete. Please log in.");
    expect(JSON.parse(localStorage.getItem("writespace_users"))).toHaveLength(1);
    expect(localStorage.getItem("writespace_session")).toBeNull();
  });
});
