import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import App from "./App";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

const USER_SESSION = {
  userId: "8dbd86a0-c472-4707-a142-3d7f38664c57",
  username: "morgan",
  displayName: "Morgan Lee",
  role: "user",
};
const ADMIN_SESSION = { userId: "admin", username: "admin", displayName: "Admin", role: "admin" };

function renderApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function LocationView() {
  const location = useLocation();
  return <output aria-label="current path">{location.pathname}</output>;
}

function renderGuard(path, guardProps = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ProtectedRoute {...guardProps} />}>
          <Route path={path} element={<h1>Allowed</h1>} />
        </Route>
        <Route path="/login" element={<LocationView />} />
        <Route path="/blogs" element={<LocationView />} />
        <Route path="/admin" element={<LocationView />} />
      </Routes>
    </MemoryRouter>,
  );
}

function seedSession(session) {
  localStorage.setItem("writespace_session", JSON.stringify(session));
}

function post(id, title, content, createdAt) {
  return {
    id,
    title,
    content,
    createdAt,
    authorId: "8dbd86a0-c472-4707-a142-3d7f38664c57",
    authorName: "Morgan Lee",
  };
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("landing discovery", () => {
  it("renders exact hero, feature, empty-state, footer copy, and guest actions", () => {
    renderApp();

    expect(screen.getByRole("heading", { level: 1, name: "WriteSpace" })).toBeVisible();
    expect(screen.getByText("Your thoughts. Your space. Beautifully simple.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Start Reading" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Get Started Free" })).toHaveAttribute("href", "/register");
    for (const title of ["Write Freely", "Private & Local", "Instant & Fast"]) {
      expect(screen.getByRole("heading", { name: title })).toBeVisible();
    }
    expect(screen.getByText("No posts yet — check back soon!")).toBeVisible();
    expect(screen.getByText(`© ${new Date().getFullYear()} WriteSpace. Browser-local demo.`)).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Footer navigation" })).toBeVisible();
  });

  it("sorts newest-first, limits previews to three, and truncates excerpts to 120 characters", async () => {
    const content = "x".repeat(140);
    localStorage.setItem("writespace_posts", JSON.stringify([
      post("00000000-0000-4000-8000-000000000001", "Oldest", "old", "2026-01-01T00:00:00.000Z"),
      post("00000000-0000-4000-8000-000000000002", "Newest", content, "2026-04-01T00:00:00.000Z"),
      post("00000000-0000-4000-8000-000000000003", "Second", "second", "2026-03-01T00:00:00.000Z"),
      post("00000000-0000-4000-8000-000000000004", "Third", "third", "2026-02-01T00:00:00.000Z"),
    ]));
    renderApp();

    await waitFor(() => expect(screen.getByRole("link", { name: /Newest/ })).toBeVisible());
    const previewNames = ["Newest", "Second", "Third"];
    const previews = previewNames.map((title) => screen.getByRole("link", { name: new RegExp(title) }));
    expect(previews).toHaveLength(3);
    expect(previews.map((link) => link.textContent)).toEqual([
      expect.stringContaining("Newest"),
      expect.stringContaining("Second"),
      expect.stringContaining("Third"),
    ]);
    expect(previews.map((link) => link.getAttribute("href"))).toEqual(["/login", "/login", "/login"]);
    expect(screen.getByText("x".repeat(120))).toBeVisible();
    expect(screen.queryByText("Oldest")).not.toBeInTheDocument();
  });

  it("sends a guest preview click to login", async () => {
    const user = userEvent.setup();
    localStorage.setItem("writespace_posts", JSON.stringify([
      post("00000000-0000-4000-8000-000000000001", "A local story", "Preview", "2026-01-01T00:00:00.000Z"),
    ]));
    renderApp();

    const preview = await screen.findByRole("link", { name: /A local story/ });
    expect(preview).toHaveAttribute("href", "/login");
    await user.click(preview);

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  it("shows a recovery warning instead of an empty state for corrupt posts", async () => {
    localStorage.setItem("writespace_posts", "{");
    renderApp();

    expect(await screen.findByRole("alert")).toHaveTextContent("Saved posts are unavailable.");
    expect(screen.queryByText("No posts yet — check back soon!")).not.toBeInTheDocument();
  });

  it("opens and closes the accessible public mobile menu", async () => {
    const user = userEvent.setup();
    renderApp();
    const toggle = screen.getByRole("button", { name: "Toggle navigation menu" });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Get Started", { selector: "a.block" })).toBeVisible();
  });

  it("renders authenticated landing actions and routes Start Reading toward blogs", () => {
    seedSession(USER_SESSION);
    renderApp();

    expect(screen.getByText("Morgan Lee")).toBeVisible();
    expect(screen.getByRole("link", { name: "Start Reading" })).toHaveAttribute("href", "/blogs");
    expect(screen.getByLabelText("User avatar")).toHaveTextContent("📖");
  });
});

describe("route guards and fallback", () => {
  it("redirects a guest from an authenticated route to login", () => {
    renderGuard("/secret");
    expect(screen.getByLabelText("current path")).toHaveTextContent("/login");
  });

  it("redirects a regular user from an admin route to blogs", () => {
    seedSession(USER_SESSION);
    renderGuard("/secret", { requiredRole: "admin" });
    expect(screen.getByLabelText("current path")).toHaveTextContent("/blogs");
  });

  it("allows admin through an admin route", () => {
    seedSession(ADMIN_SESSION);
    renderGuard("/secret", { requiredRole: "admin" });
    expect(screen.getByRole("heading", { name: "Allowed" })).toBeVisible();
  });

  it("redirects authenticated guest-only access to the correct role home", () => {
    seedSession(ADMIN_SESSION);
    const { unmount } = renderGuard("/guest", { guestOnly: true });
    expect(screen.getByLabelText("current path")).toHaveTextContent("/admin");
    unmount();

    seedSession(USER_SESSION);
    renderGuard("/guest", { guestOnly: true });
    expect(screen.getByLabelText("current path")).toHaveTextContent("/blogs");
  });

  it("treats a malformed session as absent", () => {
    localStorage.setItem("writespace_session", JSON.stringify({ userId: "admin", role: "admin" }));
    renderGuard("/secret");
    expect(screen.getByLabelText("current path")).toHaveTextContent("/login");
  });

  it("redirects unknown slice routes to the implemented landing page", () => {
    renderApp("/not-in-this-slice");
    expect(screen.getByRole("heading", { level: 1, name: "WriteSpace" })).toBeVisible();
  });
});

describe("route-aware document titles", () => {
  it.each([
    ["/", "Landing · WriteSpace", null],
    ["/login", "Login · WriteSpace", null],
    ["/register", "Register · WriteSpace", null],
    ["/blogs", "Blogs · WriteSpace", USER_SESSION],
    ["/write", "Write · WriteSpace", USER_SESSION],
    [`/edit/00000000-0000-4000-8000-000000000001`, "Edit · WriteSpace", USER_SESSION],
    ["/admin", "Admin · WriteSpace", ADMIN_SESSION],
    ["/users", "Users · WriteSpace", ADMIN_SESSION],
  ])("sets %s to %s", async (path, title, session) => {
    if (session) seedSession(session);
    if (path.startsWith("/edit/")) {
      localStorage.setItem(
        "writespace_posts",
        JSON.stringify([
          post(
            "00000000-0000-4000-8000-000000000001",
            "Editable",
            "Body",
            "2026-01-01T00:00:00.000Z",
          ),
        ]),
      );
    }

    renderApp(path);

    await waitFor(() => expect(document.title).toBe(title));
  });
});

describe("authenticated navbar logout", () => {
  it("clears the session and returns to public navigation", async () => {
    const user = userEvent.setup();
    seedSession(USER_SESSION);
    renderApp();

    await user.click(screen.getByRole("button", { name: /Morgan Lee/ }));
    await user.click(screen.getByRole("menuitem", { name: "Logout" }));

    await waitFor(() => expect(screen.getByRole("link", { name: "Get Started" })).toBeVisible());
    expect(localStorage.getItem("writespace_session")).toBeNull();
  });

  it("keeps the current view and reports a storage failure when logout cannot clear", async () => {
    const user = userEvent.setup();
    seedSession(USER_SESSION);
    const storagePrototype = Object.getPrototypeOf(localStorage);
    vi.spyOn(storagePrototype, "removeItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });
    render(
      <MemoryRouter>
        <Navbar session={USER_SESSION} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /Morgan Lee/ }));
    await user.click(screen.getByRole("menuitem", { name: "Logout" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Logout could not be completed");
    expect(localStorage.getItem("writespace_session")).not.toBeNull();
  });
});
