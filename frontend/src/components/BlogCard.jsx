import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import Avatar from "./Avatar";

const accentClasses = ["border-indigo-500", "border-violet-500", "border-pink-500", "border-teal-500"];

/**
 * Format a post timestamp in the browser-local WriteSpace display format.
 *
 * @param {string} value - Canonical persisted ISO timestamp.
 * @returns {string} A browser-local date such as Mar 04, 2026.
 */
export function formatPostDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Render one post preview with its deterministic accent and allowed actions.
 *
 * @param {{post: {id: string, title: string, content: string, createdAt: string, authorName: string}, index: number, canEdit?: boolean}} props - Post card data and permissions.
 * @returns {JSX.Element} A linked post preview card.
 */
export function BlogCard({ post, index, canEdit = false }) {
  const accentClass = accentClasses[index % accentClasses.length];

  return (
    <article className={`flex h-full flex-col rounded-xl border border-slate-200 border-t-4 bg-white p-6 shadow-sm ${accentClass}`}>
      <div className="flex-1">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          <Link
            className="rounded-sm hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            to={`/blog/${post.id}`}
          >
            {post.title}
          </Link>
        </h2>
        <p className="mt-3 break-words text-sm leading-6 text-slate-600">{post.content.slice(0, 120)}</p>
      </div>
      <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar role="user" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{post.authorName}</p>
            <time className="text-xs text-slate-500" dateTime={post.createdAt}>
              {formatPostDate(post.createdAt)}
            </time>
          </div>
        </div>
        {canEdit && (
          <Link
            aria-label={`Edit ${post.title}`}
            className="shrink-0 rounded-lg border border-indigo-600 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            to={`/edit/${post.id}`}
          >
            Edit
          </Link>
        )}
      </div>
    </article>
  );
}

BlogCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    createdAt: PropTypes.string.isRequired,
    authorName: PropTypes.string.isRequired,
  }).isRequired,
  index: PropTypes.number.isRequired,
  canEdit: PropTypes.bool,
};

export default BlogCard;
