import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import BlogCard, { formatPostDate } from "../components/BlogCard";
import { sortPostsNewestFirst } from "./Home";

const USER_ID = "8dbd86a0-c472-4707-a142-3d7f38664c57";
const OTHER_ID = "37d409c1-5c7a-45c1-bc66-e40e5288c94a";
const POST_ID = "a12f36aa-e52d-4a93-b30a-4f3dd2c6f3ab";
const SECOND_POST_ID = "00000000-0000-4000-8000-000000000002";
const NEW_POST_ID = "00000000-0000-4000-8000-000000000003";

const userSession = {
  userId: USER_ID,
  username: "morgan",
  displayName: "Morgan Lee",
  role: "user",
};

const adminSession = {
  userId: "admin",
  username: "admin",
  displayName: "Admin",
  role: "admin",
};

const ownedPost = {
  id: POST_ID,
  title: "Owned post",
  content: "First line\nSecond line <script>alert('no')</script>",
  createdAt: "2026-03-04T12:00:00.000Z",
  authorId: USER_ID,
  authorName: "Morgan Lee",
};

const otherPost = {
  id: SECOND_POST_ID,
  title: "Other author post",
  content: "Other content",
  createdAt: "2026-04-05T12:00:00.000Z",
  authorId: OTHER_ID,
  authorName: "Other Author",
};

/** Render the real application at one in-memory route. */
function renderRoute(path, entries = [path]) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <App />
    </MemoryRouter>,
  );
}

/** Persist a canonical session for route and ownership checks. */
function seedSession(session = userSession) {
  localStorage.setItem("writespace_session", JSON.stringify(session));
}

/** Persist complete valid posts through the browser boundary. */
function seedPosts(posts = [ownedPost]) {
  localStorage.setItem("writespace_posts", JSON.stringify(posts));
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(NEW_POST_ID);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("publishing route and presentation contracts", () => {
  it("redirects a guest from every protected publishing route to login", async () => {
    for (const route of ["/blogs", `/blog/${POST_ID}`, "/write", `/edit/${POST_ID}`]) {
      const view = renderRoute(route);
      expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeVisible();
      view.unmount();
    }
  });

  it("sorts a copy newest-first without changing persisted order", () => {
    const source = [ownedPost, otherPost];
    expect(sortPostsNewestFirst(source).map((post) => post.id)).toEqual([SECOND_POST_ID, POST_ID]);
    expect(source.map((post) => post.id)).toEqual([POST_ID, SECOND_POST_ID]);
  });

  it("returns the visible fallback for an invalid post timestamp", () => {
    expect(formatPostDate("not-a-timestamp")).toBe("Date unavailable");
  });

  it("formats dates locally and renders exactly 120 code units with cycling accents", () => {
    const content = `${"x".repeat(120)}hidden`;
    const post = { ...ownedPost, content };
    const { container, rerender } = render(
      <MemoryRouter>
        <BlogCard canEdit index={0} post={post} />
      </MemoryRouter>,
    );

    expect(screen.getByText("x".repeat(120))).toBeVisible();
    expect(screen.queryByText(/hidden/)).not.toBeInTheDocument();
    expect(screen.getByText(formatPostDate(post.createdAt))).toBeVisible();
    expect(container.querySelector("article")).toHaveClass("border-indigo-500");
    expect(screen.getByRole("link", { name: "Edit Owned post" })).toHaveAttribute("href", `/edit/${POST_ID}`);

    rerender(
      <MemoryRouter>
        <BlogCard index={3} post={post} />
      </MemoryRouter>,
    );
    expect(container.querySelector("article")).toHaveClass("border-teal-500");
    expect(screen.queryByRole("link", { name: "Edit Owned post" })).not.toBeInTheDocument();
  });

  it("renders newest-first cards, exact responsive grid, and only authorized edit controls", async () => {
    seedSession();
    seedPosts([ownedPost, otherPost]);
    const { container } = renderRoute("/blogs");

    const headings = await screen.findAllByRole("heading", { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual(["Other author post", "Owned post"]);
    expect(container.querySelector('[aria-label="Blog posts"]')).toHaveClass("grid-cols-1", "md:grid-cols-2", "lg:grid-cols-3");
    expect(screen.getByRole("link", { name: "Edit Owned post" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Edit Other author post" })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("writespace_posts")).map((post) => post.id)).toEqual([POST_ID, SECOND_POST_ID]);
  });

  it("renders the exact empty text and both write calls to action", async () => {
    seedSession();
    renderRoute("/blogs");

    expect(await screen.findByText("No blogs yet. Be the first to write one!")).toBeVisible();
    expect(screen.getByRole("link", { name: "Write New Post" })).toHaveAttribute("href", "/write");
    expect(screen.getByRole("link", { name: "Write a Blog" })).toHaveAttribute("href", "/write");
  });

  it("shows corruption warning and withholds collection-dependent controls", async () => {
    seedSession();
    localStorage.setItem("writespace_posts", "not-json");
    renderRoute("/blogs");

    expect(await screen.findByRole("alert")).toHaveTextContent("corrupted");
    expect(screen.queryByRole("link", { name: "Write New Post" })).not.toBeInTheDocument();
    expect(localStorage.getItem("writespace_posts")).toBe("not-json");
  });
});

describe("ReadBlog", () => {
  it("renders escaped interpolation with preserved whitespace and exact not-found behavior", async () => {
    seedSession();
    seedPosts();
    const { container, unmount } = renderRoute(`/blog/${POST_ID}`);

    expect(await screen.findByRole("heading", { name: "Owned post" })).toBeVisible();
    expect(document.title).toBe("Owned post · WriteSpace");
    expect(container.querySelector(".whitespace-pre-wrap")).toHaveTextContent("First line Second line <script>alert('no')</script>");
    expect(container.querySelector("script")).toBeNull();
    unmount();

    document.title = "Stale post · WriteSpace";
    renderRoute(`/blog/${SECOND_POST_ID}`);
    expect(await screen.findByRole("heading", { name: "Post not found" })).toBeVisible();
    expect(document.title).toBe("Post not found · WriteSpace");
    expect(screen.getByRole("link", { name: "Back to All Posts" })).toHaveAttribute("href", "/blogs");
  });

  it("shows no mutation controls to a non-owner and all controls to admin", async () => {
    seedSession();
    seedPosts([otherPost]);
    const userView = renderRoute(`/blog/${SECOND_POST_ID}`);
    expect(await screen.findByText("Other content")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Edit Post" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Post" })).not.toBeInTheDocument();
    userView.unmount();

    seedSession(adminSession);
    renderRoute(`/blog/${SECOND_POST_ID}`);
    expect(await screen.findByRole("link", { name: "Edit Post" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Delete Post" })).toBeVisible();
  });

  it("keeps state unchanged when deletion confirmation is declined", async () => {
    const user = userEvent.setup();
    seedSession();
    seedPosts();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderRoute(`/blog/${POST_ID}`);

    await user.click(await screen.findByRole("button", { name: "Delete Post" }));
    expect(JSON.parse(localStorage.getItem("writespace_posts"))).toEqual([ownedPost]);
    expect(screen.getByRole("heading", { name: "Owned post" })).toBeVisible();
  });

  it("persists confirmed deletion before navigating to the exact empty state", async () => {
    const user = userEvent.setup();
    seedSession();
    seedPosts();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderRoute(`/blog/${POST_ID}`);

    await user.click(await screen.findByRole("button", { name: "Delete Post" }));
    expect(await screen.findByText("No blogs yet. Be the first to write one!")).toBeVisible();
    expect(JSON.parse(localStorage.getItem("writespace_posts"))).toEqual([]);
  });

  it("retains the post and reader when deletion persistence fails", async () => {
    const user = userEvent.setup();
    seedSession();
    seedPosts();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const storagePrototype = Object.getPrototypeOf(localStorage);
    const originalSetItem = storagePrototype.setItem;
    vi.spyOn(storagePrototype, "setItem").mockImplementation(function setItem(key, value) {
      if (key === "writespace_posts") throw new DOMException("quota");
      return originalSetItem.call(this, key, value);
    });
    renderRoute(`/blog/${POST_ID}`);

    await user.click(await screen.findByRole("button", { name: "Delete Post" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Nothing was changed");
    expect(screen.getByRole("alert")).toHaveTextContent("Browser storage may be blocked or full");
    expect(screen.getByRole("heading", { name: "Owned post" })).toBeVisible();
    expect(JSON.parse(localStorage.getItem("writespace_posts"))).toEqual([ownedPost]);
  });

  it("rechecks owner authorization before delete and redirects without confirmation", async () => {
    const user = userEvent.setup();
    seedSession();
    seedPosts();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderRoute(`/blog/${POST_ID}`);
    await screen.findByRole("button", { name: "Delete Post" });
    seedSession({ ...userSession, userId: OTHER_ID });

    await user.click(screen.getByRole("button", { name: "Delete Post" }));
    expect(await screen.findByRole("heading", { name: "All Blogs" })).toBeVisible();
    expect(confirm).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem("writespace_posts"))).toEqual([ownedPost]);
  });
});

describe("WriteBlog create mode", () => {
  it("announces both required errors, focuses the first invalid field, and writes nothing", async () => {
    const user = userEvent.setup();
    seedSession();
    renderRoute("/write");

    await user.click(await screen.findByRole("button", { name: "Publish Post" }));
    expect(screen.getByText("Title is required.")).toHaveAttribute("id", "post-title-error");
    expect(screen.getByText("Content is required.")).toHaveAttribute("id", "post-content-error");
    expect(screen.getByLabelText("Title")).toHaveFocus();
    expect(localStorage.getItem("writespace_posts")).toBeNull();
  });

  it("counts unbounded characters and persists UUID, ISO time, session author, and plain text before reading", async () => {
    const user = userEvent.setup();
    seedSession();
    renderRoute("/write");
    const content = `${"a".repeat(500)}\n<script>plain</script>`;

    await user.type(await screen.findByLabelText("Title"), "  Created title  ");
    await user.click(screen.getByLabelText("Content"));
    await user.paste(content);
    expect(screen.getByText(`${content.length} characters`)).toBeVisible();
    expect(screen.getByLabelText("Content")).not.toHaveAttribute("maxlength");
    await user.click(screen.getByRole("button", { name: "Publish Post" }));

    expect(await screen.findByRole("heading", { name: "Created title" })).toBeVisible();
    const stored = JSON.parse(localStorage.getItem("writespace_posts"))[0];
    expect(stored).toMatchObject({
      id: NEW_POST_ID,
      title: "Created title",
      content,
      authorId: USER_ID,
      authorName: "Morgan Lee",
    });
    expect(new Date(stored.createdAt).toISOString()).toBe(stored.createdAt);
  });

  it("blocks creation against corrupt data and preserves the corrupt value", async () => {
    seedSession();
    localStorage.setItem("writespace_posts", "bad-json");
    renderRoute("/write");

    expect(await screen.findByRole("alert")).toHaveTextContent("publishing changes are blocked");
    expect(screen.getByRole("link", { name: "Back to All Posts" })).toHaveAttribute("href", "/blogs");
    expect(screen.queryByRole("button", { name: "Publish Post" })).not.toBeInTheDocument();
    expect(localStorage.getItem("writespace_posts")).toBe("bad-json");
  });

  it("reports UUID and persistence failures without navigating or inventing an ID", async () => {
    const user = userEvent.setup();
    seedSession();
    globalThis.crypto.randomUUID.mockImplementation(() => {
      throw new Error("unsupported");
    });
    renderRoute("/write");
    await user.type(await screen.findByLabelText("Title"), "Unsaved");
    await user.type(screen.getByLabelText("Content"), "Content");
    await user.click(screen.getByRole("button", { name: "Publish Post" }));
    expect(screen.getByRole("alert")).toHaveTextContent("does not support secure post IDs");
    expect(localStorage.getItem("writespace_posts")).toBeNull();

    globalThis.crypto.randomUUID.mockReturnValue(NEW_POST_ID);
    const storagePrototype = Object.getPrototypeOf(localStorage);
    vi.spyOn(storagePrototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota");
    });
    await user.click(screen.getByRole("button", { name: "Publish Post" }));
    expect(screen.getByRole("alert")).toHaveTextContent("was not published");
    expect(screen.getByRole("heading", { name: "Write a Post" })).toBeVisible();
  });

  it("cancels creation to blogs without saving", async () => {
    const user = userEvent.setup();
    seedSession();
    renderRoute("/write");
    await user.type(await screen.findByLabelText("Title"), "Discard me");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(await screen.findByRole("heading", { name: "All Blogs" })).toBeVisible();
    expect(localStorage.getItem("writespace_posts")).toBeNull();
  });
});

describe("WriteBlog edit mode", () => {
  it("loads owned content and preserves every immutable field after save", async () => {
    const user = userEvent.setup();
    seedSession();
    seedPosts([ownedPost, otherPost]);
    renderRoute(`/edit/${POST_ID}`);

    expect(await screen.findByLabelText("Title")).toHaveValue("Owned post");
    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Edited title");
    await user.clear(screen.getByLabelText("Content"));
    await user.type(screen.getByLabelText("Content"), "Edited content");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByRole("heading", { name: "Edited title" })).toBeVisible();
    const edited = JSON.parse(localStorage.getItem("writespace_posts"))[0];
    expect(edited).toEqual({ ...ownedPost, title: "Edited title", content: "Edited content" });
    expect(JSON.parse(localStorage.getItem("writespace_posts"))[1]).toEqual(otherPost);
  });

  it("redirects missing and unauthorized edit routes to blogs without mutation", async () => {
    seedSession();
    seedPosts([otherPost]);
    const unauthorized = renderRoute(`/edit/${SECOND_POST_ID}`);
    expect(await screen.findByRole("heading", { name: "All Blogs" })).toBeVisible();
    unauthorized.unmount();

    renderRoute(`/edit/${POST_ID}`);
    expect(await screen.findByRole("heading", { name: "All Blogs" })).toBeVisible();
    expect(JSON.parse(localStorage.getItem("writespace_posts"))).toEqual([otherPost]);
  });

  it("re-reads and rechecks authorization on submit", async () => {
    const user = userEvent.setup();
    seedSession();
    seedPosts();
    renderRoute(`/edit/${POST_ID}`);
    expect(await screen.findByLabelText("Title")).toHaveValue("Owned post");
    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Should not save");
    seedSession({ ...userSession, userId: OTHER_ID });
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByRole("heading", { name: "All Blogs" })).toBeVisible();
    expect(JSON.parse(localStorage.getItem("writespace_posts"))).toEqual([ownedPost]);
  });

  it("allows admin edit and returns edit cancel to the post without saving", async () => {
    const user = userEvent.setup();
    seedSession(adminSession);
    seedPosts([otherPost]);
    renderRoute(`/edit/${SECOND_POST_ID}`);

    expect(await screen.findByLabelText("Title")).toHaveValue("Other author post");
    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Discarded admin edit");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(await screen.findByRole("heading", { name: "Other author post" })).toBeVisible();
    expect(JSON.parse(localStorage.getItem("writespace_posts"))).toEqual([otherPost]);
  });

  it("keeps the edit form and original state when persistence fails", async () => {
    const user = userEvent.setup();
    seedSession();
    seedPosts();
    const storagePrototype = Object.getPrototypeOf(localStorage);
    vi.spyOn(storagePrototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota");
    });
    renderRoute(`/edit/${POST_ID}`);
    await screen.findByLabelText("Title");
    await user.clear(screen.getByLabelText("Content"));
    await user.type(screen.getByLabelText("Content"), "Unsaved edit");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(screen.getByRole("alert")).toHaveTextContent("original post is unchanged");
    expect(screen.getByRole("heading", { name: "Edit Post" })).toBeVisible();
    expect(JSON.parse(localStorage.getItem("writespace_posts"))).toEqual([ownedPost]);
  });
});
