import { useState } from "react";
import { Link } from "react-router-dom";
import BlogCard from "../components/BlogCard";
import { getSession } from "../utils/auth";
import { readPosts } from "../utils/storage";

/**
 * Sort a copied post collection newest-first without changing persisted order.
 *
 * @param {Array<{createdAt: string}>} posts - Valid persisted posts.
 * @returns {Array<{createdAt: string}>} A newest-first copy.
 */
export function sortPostsNewestFirst(posts) {
  return [...posts].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

/** Return actionable copy for an unreadable local post collection. */
function getReadWarning(status) {
  return status === "corrupt"
    ? "Saved post data is corrupted and cannot be displayed. Inspect or clear this browser’s local data before continuing."
    : "Local browser post data is unavailable. Check your browser storage settings and try again.";
}

/** Render the authenticated, newest-first post collection. */
export function Home() {
  const [postsResult] = useState(() => readPosts());
  const session = getSession();
  const readStatus = postsResult.status;
  const posts = readStatus === "ok" ? sortPostsNewestFirst(postsResult.data) : [];

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-700">Your local library</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">All Blogs</h1>
            <p className="mt-2 max-w-2xl text-slate-600">Read every post saved in this browser, or add a new thought of your own.</p>
          </div>
          {readStatus === "ok" && (
            <Link
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              to="/write"
            >
              Write New Post
            </Link>
          )}
        </div>

        {readStatus !== "ok" ? (
          <p className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700" role="alert">
            {getReadWarning(readStatus)}
          </p>
        ) : posts.length === 0 ? (
          <section className="mt-12 rounded-xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">No blogs yet. Be the first to write one!</h2>
            <Link
              className="mt-6 inline-flex rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              to="/write"
            >
              Write a Blog
            </Link>
          </section>
        ) : (
          <section aria-label="Blog posts" className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => (
              <BlogCard
                canEdit={session?.role === "admin" || post.authorId === session?.userId}
                index={index}
                key={post.id}
                post={post}
              />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

export default Home;
