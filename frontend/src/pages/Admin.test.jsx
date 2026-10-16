import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

const USER_ID = "8dbd86a0-c472-4707-a142-3d7f38664c57";
const OTHER_ID = "37d409c1-5c7a-45c1-bc66-e40e5288c94a";
const NEW_ID = "00000000-0000-4000-8000-000000000009";
const adminSession = { userId: "admin", username: "admin", displayName: "Admin", role: "admin" };
const userSession = { userId: USER_ID, username: "morgan", displayName: "Morgan", role: "user" };
const localAdminSession = { userId: OTHER_ID, username: "local-admin", displayName: "Local Admin", role: "admin" };

function makeUser(overrides = {}) {
  return { id: USER_ID, displayName: "Morgan", username: "morgan", password: "plain-demo", role: "user", createdAt: "2026-03-04T12:00:00.000Z", ...overrides };
}

function makePost(index) {
  return { id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`, title: `Post ${index}`, content: `Content ${index}`, createdAt: new Date(Date.UTC(2026, 0, index)).toISOString(), authorId: USER_ID, authorName: "Morgan" };
}

function renderRoute(path) {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
}

function seedSession(session = adminSession) {
  localStorage.setItem("writespace_session", JSON.stringify(session));
}

function seedUsers(users) {
  localStorage.setItem("writespace_users", JSON.stringify(users));
}

function seedPosts(posts) {
  localStorage.setItem("writespace_posts", JSON.stringify(posts));
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

describe("admin route and dashboard", () => {
  it("redirects guests to login and ordinary users to blogs on both admin routes", async () => {
    for (const path of ["/admin", "/users"]) {
      const guest = renderRoute(path);
      expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeVisible();
      guest.unmount();
      seedSession(userSession);
      const ordinary = renderRoute(path);
      expect(await screen.findByRole("heading", { name: "All Blogs" })).toBeVisible();
      ordinary.unmount();
      localStorage.clear();
    }
  });

  it("shows ordinary users, admins including built-in, disabled pending slot, quick links, and newest five", async () => {
    seedSession();
    seedUsers([makeUser(), makeUser({ id: OTHER_ID, username: "editor", displayName: "Editor", role: "admin" })]);
    seedPosts([1, 2, 3, 4, 5, 6].map(makePost));
    renderRoute("/admin");

    expect(await screen.findByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
    const stats = screen.getByRole("region", { name: "Administration statistics" });
    expect(within(stats).getByText("Total Posts").nextElementSibling).toHaveTextContent("6");
    expect(within(stats).getByText("Total Users").nextElementSibling).toHaveTextContent("2");
    expect(within(stats).getByText("Total Admins").nextElementSibling).toHaveTextContent("2");
    expect(within(stats).getByText("Total users").closest("article")).toHaveAttribute("aria-disabled", "true");
    expect(within(stats).getByText("Pending decision")).toBeVisible();
    expect(screen.getByRole("link", { name: "Write New Post" })).toHaveAttribute("href", "/write");
    expect(screen.getByRole("link", { name: "Manage Users" })).toHaveAttribute("href", "/users");
    expect(screen.getByRole("link", { name: "Post 6" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Post 1" })).not.toBeInTheDocument();
  });

  it("warns for independently corrupt collections and blocks post actions when posts are unreadable", async () => {
    seedSession();
    localStorage.setItem("writespace_posts", "bad-json");
    localStorage.setItem("writespace_users", "{}");
    renderRoute("/admin");
    const alerts = await screen.findAllByRole("alert");
    expect(alerts.map((node) => node.textContent).join(" ")).toMatch(/post data is corrupted/);
    expect(alerts.map((node) => node.textContent).join(" ")).toMatch(/user data is corrupted/);
    expect(screen.queryByRole("button", { name: /Delete Post/ })).not.toBeInTheDocument();
    expect(localStorage.getItem("writespace_posts")).toBe("bad-json");
  });

  it("cancels deletion without mutation and persists confirmed deletion before updating", async () => {
    const user = userEvent.setup();
    seedSession();
    seedPosts([makePost(1), makePost(2)]);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderRoute("/admin");
    await user.click(await screen.findByRole("button", { name: "Delete Post 2" }));
    expect(JSON.parse(localStorage.getItem("writespace_posts"))).toHaveLength(2);
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Delete Post 2" }));
    expect(screen.queryByRole("link", { name: "Post 2" })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("writespace_posts")).map((post) => post.title)).toEqual(["Post 1"]);
  });

  it("rechecks current admin and post existence before confirmation", async () => {
    const user = userEvent.setup();
    seedSession();
    seedPosts([makePost(1)]);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderRoute("/admin");
    await screen.findByRole("button", { name: "Delete Post 1" });
    seedSession(userSession);
    await user.click(screen.getByRole("button", { name: "Delete Post 1" }));
    expect(await screen.findByRole("heading", { name: "All Blogs" })).toBeVisible();
    expect(confirm).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem("writespace_posts"))).toHaveLength(1);
  });

  it("retains dashboard state and reports a failed post write", async () => {
    const user = userEvent.setup();
    seedSession();
    seedPosts([makePost(1)]);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const prototype = Object.getPrototypeOf(localStorage);
    const original = prototype.setItem;
    vi.spyOn(prototype, "setItem").mockImplementation(function setItem(key, value) {
      if (key === "writespace_posts") throw new DOMException("quota");
      return original.call(this, key, value);
    });
    renderRoute("/admin");
    await user.click(await screen.findByRole("button", { name: "Delete Post 1" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Nothing was changed");
    expect(screen.getByRole("alert")).toHaveTextContent("Browser storage may be blocked or full");
    expect(screen.getByRole("link", { name: "Post 1" })).toBeVisible();
  });
});

describe("user management", () => {
  it("renders a semantic desktop table and mobile cards with prescribed role avatars", async () => {
    seedSession();
    seedUsers([makeUser()]);
    const { container } = renderRoute("/users");
    expect(await screen.findByRole("heading", { name: "User Management" })).toBeVisible();
    expect(screen.getByRole("table")).toBeVisible();
    expect(screen.getByLabelText("Display Name")).toHaveAttribute("autocomplete", "off");
    expect(screen.getByLabelText("Username")).toHaveAttribute("autocomplete", "new-username");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText("Display Name").closest("form")).toHaveAttribute("autocomplete", "off");
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.getAllByRole("img", { name: "Admin avatar" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("img", { name: "User avatar" }).length).toBeGreaterThan(0);
    expect(container.querySelector("table th[scope='col']")).toBeTruthy();
  });

  it("announces required field errors, focuses the first field, and writes nothing", async () => {
    const user = userEvent.setup();
    seedSession();
    renderRoute("/users");
    await user.click(await screen.findByRole("button", { name: "Create Account" }));
    expect(screen.getByText("Display Name is required.")).toBeVisible();
    expect(screen.getByText("Username is required.")).toBeVisible();
    expect(screen.getByText("Password is required.")).toBeVisible();
    expect(screen.getByLabelText("Display Name")).toHaveFocus();
    expect(localStorage.getItem("writespace_users")).toBeNull();
  });

  it("enforces exact case-sensitive uniqueness including built-in admin", async () => {
    const user = userEvent.setup();
    seedSession();
    seedUsers([makeUser()]);
    renderRoute("/users");
    await user.type(await screen.findByLabelText("Display Name"), "Duplicate");
    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "demo");
    await user.click(screen.getByRole("button", { name: "Create Account" }));
    expect(screen.getByText("Username already exists.")).toBeVisible();

    await user.clear(screen.getByLabelText("Username"));
    await user.type(screen.getByLabelText("Username"), "Admin");
    await user.click(screen.getByRole("button", { name: "Create Account" }));
    expect(await screen.findByText("Account for Duplicate was created.")).toBeVisible();
    expect(JSON.parse(localStorage.getItem("writespace_users"))[1].username).toBe("Admin");
  });

  it("persists UUID, ISO, plaintext demo password, and selected role before clearing form", async () => {
    const user = userEvent.setup();
    seedSession();
    renderRoute("/users");
    await user.type(await screen.findByLabelText("Display Name"), "  New Admin  ");
    await user.type(screen.getByLabelText("Username"), "new-admin");
    await user.type(screen.getByLabelText("Password"), "demo-only");
    await user.selectOptions(screen.getByLabelText("Role"), "admin");
    await user.click(screen.getByRole("button", { name: "Create Account" }));
    const stored = JSON.parse(localStorage.getItem("writespace_users"))[0];
    expect(stored).toMatchObject({ id: NEW_ID, displayName: "New Admin", username: "new-admin", password: "demo-only", role: "admin" });
    expect(new Date(stored.createdAt).toISOString()).toBe(stored.createdAt);
    expect(screen.getByLabelText("Display Name")).toHaveValue("");
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("preserves the form on write failure and reports unsupported UUID", async () => {
    const user = userEvent.setup();
    seedSession();
    renderRoute("/users");
    await user.type(await screen.findByLabelText("Display Name"), "Unsaved");
    await user.type(screen.getByLabelText("Username"), "unsaved");
    await user.type(screen.getByLabelText("Password"), "demo");
    globalThis.crypto.randomUUID.mockImplementation(() => { throw new Error("unsupported"); });
    await user.click(screen.getByRole("button", { name: "Create Account" }));
    expect(screen.getByRole("alert")).toHaveTextContent("does not support secure account IDs");
    expect(screen.getByLabelText("Display Name")).toHaveValue("Unsaved");

    globalThis.crypto.randomUUID.mockReturnValue(NEW_ID);
    const prototype = Object.getPrototypeOf(localStorage);
    vi.spyOn(prototype, "setItem").mockImplementation(() => { throw new DOMException("quota"); });
    await user.click(screen.getByRole("button", { name: "Create Account" }));
    expect(screen.getByRole("alert")).toHaveTextContent("form has been preserved");
    expect(screen.getByRole("alert")).toHaveTextContent("Browser storage may be blocked or full");
    expect(screen.getByLabelText("Username")).toHaveValue("unsaved");
  });

  it("blocks all mutations for corrupt user data without overwriting it", async () => {
    seedSession();
    localStorage.setItem("writespace_users", "broken");
    renderRoute("/users");
    expect(await screen.findByRole("alert")).toHaveTextContent("corrupted");
    expect(screen.queryByRole("button", { name: "Create Account" })).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(localStorage.getItem("writespace_users")).toBe("broken");
  });

  it("disables built-in and active-account deletion with exact protection messages", async () => {
    seedSession(localAdminSession);
    seedUsers([makeUser({ id: OTHER_ID, username: "local-admin", displayName: "Local Admin", role: "admin" }), makeUser()]);
    renderRoute("/users");
    await screen.findByRole("heading", { name: "User Management" });
    const defaultButtons = screen.getAllByRole("button", { name: "Delete Admin" });
    expect(defaultButtons[0]).toBeDisabled();
    expect(defaultButtons[0].parentElement).toHaveAttribute("title", "Default admin cannot be deleted.");
    expect(screen.getAllByRole("button", { name: "Delete Local Admin" })[0]).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Delete Local Admin" })[0].parentElement).toHaveAttribute("title", "You cannot delete the currently active account.");
  });

  it("cancels eligible deletion, then confirms and persists it", async () => {
    const user = userEvent.setup();
    seedSession();
    seedUsers([makeUser()]);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderRoute("/users");
    const button = (await screen.findAllByRole("button", { name: "Delete Morgan" }))[0];
    await user.click(button);
    expect(JSON.parse(localStorage.getItem("writespace_users"))).toHaveLength(1);
    confirm.mockReturnValue(true);
    await user.click(button);
    expect(await screen.findByText("Account for Morgan was deleted.")).toBeVisible();
    expect(JSON.parse(localStorage.getItem("writespace_users"))).toEqual([]);
  });

  it("rechecks active identity before delete and retains users on failed persistence", async () => {
    const user = userEvent.setup();
    seedSession();
    seedUsers([makeUser({ id: OTHER_ID })]);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const view = renderRoute("/users");
    const button = (await screen.findAllByRole("button", { name: "Delete Morgan" }))[0];
    seedSession({ ...adminSession, userId: OTHER_ID });
    await user.click(button);
    expect(screen.getByRole("alert")).toHaveTextContent("currently active account");
    expect(JSON.parse(localStorage.getItem("writespace_users"))).toHaveLength(1);

    view.unmount();
    seedSession();
    const prototype = Object.getPrototypeOf(localStorage);
    const original = prototype.setItem;
    vi.spyOn(prototype, "setItem").mockImplementation(function setItem(key, value) {
      if (key === "writespace_users") throw new DOMException("quota");
      return original.call(this, key, value);
    });
    renderRoute("/users");
    const freshButton = (await screen.findAllByRole("button", { name: "Delete Morgan" }))[0];
    await user.click(freshButton);
    expect(screen.getByRole("alert")).toHaveTextContent("Nothing was changed");
    expect(JSON.parse(localStorage.getItem("writespace_users"))).toHaveLength(1);
  });
});
