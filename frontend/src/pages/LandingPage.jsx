import { useState } from "react";
import { Link } from "react-router-dom";
import { getSession } from "../utils/auth";
import { readPosts } from "../utils/storage";

const featureCards = [
  {
    title: "Write Freely",
    description:
      "Plain-text writing with no distractions—just your ideas and a clear space to shape them.",
    icon: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z",
    color: "bg-indigo-100 text-indigo-700",
  },
  {
    title: "Private & Local",
    description:
      "Your data lives in this browser. It is local, not confidential, backed up, or protected from device access.",
    icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
    color: "bg-violet-100 text-violet-700",
  },
  {
    title: "Instant & Fast",
    description:
      "No server and no waiting. Reading and writing happen directly in your browser.",
    icon: "m13 2-9 12h8l-1 8 9-12h-8Z",
    color: "bg-pink-100 text-pink-700",
  },
];

/** Format an ISO timestamp for a concise browser-local preview date. */
function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

/** Render public discovery, recent local writing, and account entry actions. */
export function LandingPage() {
  const [postsResult] = useState(() => readPosts());
  const session = getSession();
  const readStatus = postsResult.status;
  const posts =
    readStatus === "ok"
      ? [...postsResult.data]
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
          .slice(0, 3)
      : [];

  return (
    <main className="bg-slate-50 text-slate-800">
      <section
        className={
          "relative isolate flex min-h-[calc(100vh-4rem)] items-center " +
          "overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 " +
          "to-pink-500 px-4 py-20 text-white"
        }
      >
        <div className="absolute inset-0 opacity-20" aria-hidden="true">
          <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-white blur-3xl" />
          <div className="absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-pink-200 blur-3xl" />
        </div>
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.28em] text-indigo-100">
              A local home for your words
            </p>
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
              WriteSpace
            </h1>
            <p className="mt-6 max-w-2xl text-2xl font-medium leading-relaxed text-white sm:text-3xl">
              Your thoughts. Your space. Beautifully simple.
            </p>
            <p className="mt-5 max-w-xl text-base leading-7 text-indigo-100 sm:text-lg">
              Discover ideas, write without distractions, and keep this demo’s
              stories close in your own browser.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                className={
                  "rounded-lg bg-white px-6 py-3 text-center font-semibold " +
                  "text-indigo-700 shadow-lg hover:-translate-y-0.5 " +
                  "hover:shadow-xl focus:outline-none focus-visible:ring-2 " +
                  "focus-visible:ring-white focus-visible:ring-offset-2 " +
                  "focus-visible:ring-offset-violet-600 " +
                  "motion-reduce:transform-none"
                }
                to={session ? "/blogs" : "/login"}
              >
                Start Reading
              </Link>
              <Link
                className={
                  "rounded-lg border border-white/70 bg-white/10 px-6 py-3 " +
                  "text-center font-semibold text-white backdrop-blur-sm " +
                  "hover:bg-white/20 focus:outline-none focus-visible:ring-2 " +
                  "focus-visible:ring-white focus-visible:ring-offset-2 " +
                  "focus-visible:ring-offset-violet-600"
                }
                to="/register"
              >
                Get Started Free
              </Link>
            </div>
          </div>

          <div className="hidden justify-center lg:flex" aria-hidden="true">
            <div className="animate-bounce rounded-2xl border border-white/30 bg-white/15 p-5 shadow-2xl backdrop-blur-md motion-reduce:animate-none">
              <div className="w-80 rounded-xl bg-white p-6 text-slate-800 shadow-xl">
                <div className="mb-5 flex gap-2">
                  <span className="h-3 w-3 rounded-full bg-pink-500" />
                  <span className="h-3 w-3 rounded-full bg-violet-500" />
                  <span className="h-3 w-3 rounded-full bg-teal-500" />
                </div>
                <div className="h-5 w-3/4 rounded bg-slate-800" />
                <div className="mt-5 space-y-3">
                  <div className="h-2 rounded bg-slate-200" />
                  <div className="h-2 rounded bg-slate-200" />
                  <div className="h-2 w-4/5 rounded bg-slate-200" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="features-heading"
        className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
            Made for the moment
          </p>
          <h2
            className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"
            id="features-heading"
          >
            Everything you need to begin
          </h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {featureCards.map((feature) => (
            <article
              className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none"
              key={feature.title}
            >
              <span
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}
              >
                <svg
                  aria-hidden="true"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d={feature.icon} />
                </svg>
              </span>
              <h3 className="mt-5 text-xl font-bold text-slate-900">
                {feature.title}
              </h3>
              <p className="mt-3 leading-7 text-slate-600">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="latest-heading"
        className="bg-white px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
            From this browser
          </p>
          <h2
            className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"
            id="latest-heading"
          >
            Latest writing
          </h2>
          {readStatus !== "ok" ? (
            <div
              className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900"
              role="alert"
            >
              Saved posts are unavailable. Check or clear this browser’s local
              data before continuing.
            </div>
          ) : posts.length === 0 ? (
            <p className="mt-8 rounded-2xl bg-slate-50 p-8 text-center font-medium text-slate-600">
              No posts yet — check back soon!
            </p>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {posts.map((post) => (
                <Link
                  className={
                    "group rounded-2xl border-t-4 border-indigo-500 bg-slate-50 " +
                    "p-6 text-left shadow-sm hover:-translate-y-1 hover:shadow-lg " +
                    "focus:outline-none focus-visible:ring-2 " +
                    "focus-visible:ring-indigo-600 focus-visible:ring-offset-2 " +
                    "motion-reduce:transform-none"
                  }
                  key={post.id}
                  to={session ? `/blog/${post.id}` : "/login"}
                >
                  <time
                    className="text-sm font-medium text-slate-500"
                    dateTime={post.createdAt}
                  >
                    {formatDate(post.createdAt)}
                  </time>
                  <h3 className="mt-3 text-xl font-bold text-slate-900 group-hover:text-indigo-700">
                    {post.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {post.content.slice(0, 120)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="bg-slate-900 px-4 py-10 text-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <p>© {new Date().getFullYear()} WriteSpace. Browser-local demo.</p>
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap justify-center gap-5 text-sm font-medium"
          >
            <Link
              className="hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              to="/"
            >
              Home
            </Link>
            <Link
              className="hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              to={session ? "/blogs" : "/login"}
            >
              All Blogs
            </Link>
            <Link
              className="hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              to="/login"
            >
              Login
            </Link>
            <Link
              className="hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              to="/register"
            >
              Register
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

export default LandingPage;
