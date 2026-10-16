import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Avatar from "../components/Avatar";
import { formatPostDate } from "../components/BlogCard";
import { getSession } from "../utils/auth";
import { readPosts, savePosts } from "../utils/storage";

/** Return actionable copy for an unreadable local post collection. */
function getReadWarning(status) {
  return status === "corrupt"
    ? "Saved post data is corrupted and cannot be displayed or changed. Inspect or clear this browser’s local data before continuing."
    : "Local browser post data is unavailable. Check your browser storage settings and try again.";
}

/** Resolve one route ID from a single synchronous storage read. */
function resolvePost(postId) {
  const result = readPosts();
  return {
    id: postId,
    post:
      result.status === "ok"
        ? result.data.find((candidate) => candidate.id === postId) || null
        : null,
    status: result.status,
  };
}

/** Render one complete plain-text post and permission-sensitive actions. */
export function ReadBlog() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resolution, setResolution] = useState(() => resolvePost(id));
  const [operationError, setOperationError] = useState("");
  const session = getSession();
  const isResolved = resolution.id === id;
  const post = isResolved ? resolution.post : null;
  const readStatus = isResolved ? resolution.status : "unresolved";

  useEffect(() => {
    if (!isResolved) setResolution(resolvePost(id));
  }, [id, isResolved]);

  useEffect(() => {
    const title = !isResolved
      ? "WriteSpace"
      : readStatus === "ok" && post
        ? `${post.title} · WriteSpace`
        : readStatus === "ok"
          ? "Post not found · WriteSpace"
          : "WriteSpace";
    document.title = title;

    return () => {
      if (document.title === title) document.title = "WriteSpace";
    };
  }, [isResolved, post, readStatus]);

  /** Re-read identity and posts, confirm deletion, then navigate only after persistence. */
  function handleDelete() {
    setOperationError("");
    const currentSession = getSession();
    const result = readPosts();
    if (result.status !== "ok") {
      setResolution({ id, post: null, status: result.status });
      return;
    }

    const currentPost = result.data.find((candidate) => candidate.id === id);
    if (!currentPost || !currentSession || (currentSession.role !== "admin" && currentPost.authorId !== currentSession.userId)) {
      navigate("/blogs", { replace: true });
      return;
    }
    if (!window.confirm(`Delete “${currentPost.title}”? This cannot be undone.`)) return;

    const nextPosts = result.data.filter((candidate) => candidate.id !== id);
    if (!savePosts(nextPosts)) {
      setOperationError(
        "The post could not be deleted. Nothing was changed. Browser storage may be blocked or full; " +
          "check site storage permissions or free space, then retry.",
      );
      return;
    }
    navigate("/blogs", { replace: true });
  }

  if (!isResolved) return null;

  if (readStatus !== "ok") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700" role="alert">
          {getReadWarning(readStatus)}
        </p>
        <Link className="mt-6 inline-flex font-semibold text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" to="/blogs">
          Back to All Posts
        </Link>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Post not found</h1>
        <Link className="mt-6 inline-flex font-semibold text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" to="/blogs">
          Back to All Posts
        </Link>
      </main>
    );
  }

  const canMutate = session?.role === "admin" || post.authorId === session?.userId;

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <Link className="inline-flex font-semibold text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" to="/blogs">
          Back to All Posts
        </Link>
        <header className="mt-8 border-b border-slate-200 pb-8">
          <h1 className="break-words text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{post.title}</h1>
          <div className="mt-6 flex items-center gap-3">
            <Avatar role="user" />
            <div>
              <p className="font-semibold text-slate-800">{post.authorName}</p>
              <time className="text-sm text-slate-500" dateTime={post.createdAt}>
                {formatPostDate(post.createdAt)}
              </time>
            </div>
          </div>
        </header>
        <div className="mt-8 whitespace-pre-wrap break-words text-base leading-8 text-slate-800">{post.content}</div>

        {operationError && (
          <p className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700" role="alert">
            {operationError}
          </p>
        )}
        {canMutate && (
          <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row">
            <Link
              className="inline-flex justify-center rounded-lg border border-indigo-600 bg-white px-4 py-2 font-medium text-indigo-700 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              to={`/edit/${post.id}`}
            >
              Edit Post
            </Link>
            <button
              className="rounded-lg bg-red-50 px-4 py-2 font-medium text-red-600 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
              onClick={handleDelete}
              type="button"
            >
              Delete Post
            </button>
          </div>
        )}
      </article>
    </main>
  );
}

export default ReadBlog;
