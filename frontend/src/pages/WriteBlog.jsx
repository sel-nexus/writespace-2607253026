import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getSession } from "../utils/auth";
import { readPosts, savePosts } from "../utils/storage";

/** Return actionable copy for an unreadable local post collection. */
function getReadWarning(status) {
  return status === "corrupt"
    ? "Saved post data is corrupted, so publishing changes are blocked. Inspect or clear this browser’s local data before continuing."
    : "Local browser post data is unavailable, so publishing changes are blocked. Check your browser storage settings and try again.";
}

/** Render create and ownership-checked edit workflows for plain-text posts. */
export function WriteBlog() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const titleRef = useRef(null);
  const contentRef = useRef(null);
  const [form, setForm] = useState({ title: "", content: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [readStatus, setReadStatus] = useState("ok");
  const [isReady, setIsReady] = useState(!isEdit);

  useEffect(() => {
    const result = readPosts();
    setReadStatus(result.status);
    if (result.status !== "ok") {
      setIsReady(false);
      return;
    }
    if (!isEdit) {
      setIsReady(true);
      return;
    }

    const currentSession = getSession();
    const post = result.data.find((candidate) => candidate.id === id);
    if (!post || !currentSession || (currentSession.role !== "admin" && post.authorId !== currentSession.userId)) {
      navigate("/blogs", { replace: true });
      return;
    }
    setForm({ title: post.title, content: post.content });
    setIsReady(true);
  }, [id, isEdit, navigate]);

  /** Update one stable controlled post field. */
  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  /** Validate, re-authorize, persist the complete collection, then navigate. */
  function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = "Title is required.";
    if (!form.content.trim()) nextErrors.content = "Content is required.";
    setErrors(nextErrors);
    if (nextErrors.title) {
      titleRef.current?.focus();
      return;
    }
    if (nextErrors.content) {
      contentRef.current?.focus();
      return;
    }

    const currentSession = getSession();
    if (!currentSession) {
      navigate("/login", { replace: true });
      return;
    }
    const result = readPosts();
    if (result.status !== "ok") {
      setReadStatus(result.status);
      setIsReady(false);
      return;
    }

    if (isEdit) {
      const currentPost = result.data.find((candidate) => candidate.id === id);
      if (!currentPost || (currentSession.role !== "admin" && currentPost.authorId !== currentSession.userId)) {
        navigate("/blogs", { replace: true });
        return;
      }
      const nextPosts = result.data.map((candidate) =>
        candidate.id === id
          ? { ...candidate, title: form.title.trim(), content: form.content }
          : candidate,
      );
      if (!savePosts(nextPosts)) {
        setFormError(
          "Your changes could not be saved. The original post is unchanged. " +
            "Browser storage may be blocked or full; check site storage permissions or free space, then retry.",
        );
        return;
      }
      navigate(`/blog/${id}`, { replace: true });
      return;
    }

    let postId;
    try {
      if (typeof globalThis.crypto?.randomUUID !== "function") throw new Error("unsupported");
      postId = globalThis.crypto.randomUUID();
    } catch {
      setFormError("Your browser does not support secure post IDs. Use a modern browser and try again.");
      return;
    }

    const post = {
      id: postId,
      title: form.title.trim(),
      content: form.content,
      createdAt: new Date().toISOString(),
      authorId: currentSession.userId,
      authorName: currentSession.displayName,
    };
    if (!savePosts([...result.data, post])) {
      setFormError(
        "Your post could not be saved. It was not published. Browser storage may be blocked or full; check site storage permissions or free space, then retry.",
      );
      return;
    }
    navigate(`/blog/${post.id}`, { replace: true });
  }

  /** Return to the collection or the current post without persisting form state. */
  function handleCancel() {
    navigate(isEdit ? `/blog/${id}` : "/blogs");
  }

  if (readStatus !== "ok") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700" role="alert">
          {getReadWarning(readStatus)}
        </p>
        <Link
          className={
            "mt-6 inline-flex rounded-lg px-4 py-2 font-medium text-slate-700 " +
            "hover:bg-slate-100 focus:outline-none focus-visible:ring-2 " +
            "focus-visible:ring-indigo-600"
          }
          to="/blogs"
        >
          Back to All Posts
        </Link>
      </main>
    );
  }

  if (!isReady) return null;

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <section aria-labelledby="write-heading" className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-700">{isEdit ? "Edit your writing" : "Create something new"}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900" id="write-heading">
          {isEdit ? "Edit Post" : "Write a Post"}
        </h1>
        <p className="mt-2 text-slate-600">Plain text is saved only in this browser. Do not include sensitive information.</p>

        {formError && (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700" id="write-form-error" role="alert">
            {formError}
          </p>
        )}

        <form aria-describedby={formError ? "write-form-error" : undefined} className="mt-8 space-y-6" noValidate onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="post-title">Title</label>
            <input
              aria-describedby={errors.title ? "post-title-error" : undefined}
              aria-invalid={Boolean(errors.title)}
              aria-required="true"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
              id="post-title"
              name="title"
              onChange={updateField}
              ref={titleRef}
              type="text"
              value={form.title}
            />
            {errors.title && <p className="mt-1 text-sm text-red-600" id="post-title-error" role="alert">{errors.title}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="post-content">Content</label>
            <textarea
              aria-describedby={errors.content ? "post-content-error post-content-count" : "post-content-count"}
              aria-invalid={Boolean(errors.content)}
              aria-required="true"
              className="mt-2 min-h-64 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
              id="post-content"
              name="content"
              onChange={updateField}
              ref={contentRef}
              value={form.content}
            />
            <div className="mt-1 flex items-start justify-between gap-4">
              <div>{errors.content && <p className="text-sm text-red-600" id="post-content-error" role="alert">{errors.content}</p>}</div>
              <p className="shrink-0 text-sm text-slate-500" id="post-content-count">{form.content.length} characters</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <button
              className="rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              type="submit"
            >
              {isEdit ? "Save Changes" : "Publish Post"}
            </button>
            <button
              className="rounded-lg px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              onClick={handleCancel}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default WriteBlog;
