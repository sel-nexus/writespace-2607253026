import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatCard from "../components/StatCard";
import { formatPostDate } from "../components/BlogCard";
import { getSession } from "../utils/auth";
import { readPosts, readUsers, savePosts } from "../utils/storage";

/** Return an actionable warning for an unreadable browser-local collection. */
function storageWarning(kind, status) {
  return status === "corrupt"
    ? `Saved ${kind} data is corrupted. Related administration changes are blocked to prevent data loss.`
    : `Local browser ${kind} data is unavailable. Related administration changes are blocked until storage access is restored.`;
}

/** Sort posts newest-first without changing their persisted order. */
export function newestPosts(posts) {
  return [...posts].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

/** Render local administration metrics, shortcuts, and post controls. */
export function AdminDashboard() {
  const navigate = useNavigate();
  const [postsResult, setPostsResult] = useState(() => readPosts());
  const [usersResult] = useState(() => readUsers());
  const [operationError, setOperationError] = useState("");

  /** Re-read, re-authorize, confirm, and persist a post deletion before updating the view. */
  function handleDelete(postId) {
    setOperationError("");
    const session = getSession();
    if (!session || session.role !== "admin") {
      navigate(session ? "/blogs" : "/login", { replace: true });
      return;
    }

    const current = readPosts();
    if (current.status !== "ok") {
      setPostsResult(current);
      return;
    }
    const post = current.data.find((candidate) => candidate.id === postId);
    if (!post) {
      setOperationError("That post no longer exists. The dashboard has been refreshed.");
      setPostsResult(current);
      return;
    }
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;

    const nextPosts = current.data.filter((candidate) => candidate.id !== postId);
    if (!savePosts(nextPosts)) {
      setOperationError(
        "The post could not be deleted. Nothing was changed. Browser storage may be blocked or full; " +
          "check site storage permissions or free space, then retry.",
      );
      return;
    }
    setPostsResult({ data: nextPosts, status: "ok" });
  }

  const postsAvailable = postsResult.status === "ok";
  const usersAvailable = usersResult.status === "ok";
  const recentPosts = postsAvailable ? newestPosts(postsResult.data).slice(0, 5) : [];
  const adminCount = usersAvailable ? usersResult.data.filter((user) => user.role === "admin").length + 1 : "—";

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-violet-100">Local administration</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Admin Dashboard</h1>
          <p className="mt-3 max-w-2xl text-violet-100">Review content and accounts stored in this browser. This demo has no backup or secure server-side authorization.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link className="rounded-lg bg-white px-4 py-2.5 text-center font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600" to="/write">
              Write New Post
            </Link>
            <Link className="rounded-lg border border-white px-4 py-2.5 text-center font-semibold text-white hover:bg-white hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600" to="/users">
              Manage Users
            </Link>
          </div>
        </section>

        <div aria-live="polite" className="mt-6 space-y-3">
          {!postsAvailable && <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800" role="alert">{storageWarning("post", postsResult.status)}</p>}
          {!usersAvailable && <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800" role="alert">{storageWarning("user", usersResult.status)}</p>}
          {operationError && <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700" role="alert">{operationError}</p>}
        </div>

        <section aria-label="Administration statistics" className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Posts" value={postsAvailable ? postsResult.data.length : "—"} />
          <StatCard label="Total Users" value={usersAvailable ? usersResult.data.length : "—"} />
          <StatCard label="Total Admins" value={adminCount} />
          <StatCard disabled label="Total users" value="" />
        </section>

        <section aria-labelledby="recent-posts-heading" className="mt-10 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-violet-700">Content oversight</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900" id="recent-posts-heading">Newest Posts</h2>
            </div>
            <Link className="rounded-lg px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" to="/blogs">View all posts</Link>
          </div>

          {postsAvailable && recentPosts.length === 0 && <p className="mt-6 rounded-lg bg-slate-50 p-5 text-slate-600">No posts yet.</p>}
          {recentPosts.length > 0 && (
            <ul className="mt-5 divide-y divide-slate-100">
              {recentPosts.map((post) => (
                <li className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between" key={post.id}>
                  <div className="min-w-0">
                    <Link className="font-semibold text-slate-900 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" to={`/blog/${post.id}`}>{post.title}</Link>
                    <p className="mt-1 text-sm text-slate-500">By {post.authorName} · {formatPostDate(post.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link aria-label={`Edit ${post.title}`} className="rounded-lg border border-indigo-600 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" to={`/edit/${post.id}`}>Edit</Link>
                    <button aria-label={`Delete ${post.title}`} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600" onClick={() => handleDelete(post.id)} type="button">Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

export default AdminDashboard;
