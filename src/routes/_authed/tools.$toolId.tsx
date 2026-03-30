import { createFileRoute, Link } from "@tanstack/react-router";
import { getToolById } from "~/api/tools";
import type { ToolDetailResult, ToolWithLoan } from "~/types/tool";

export const Route = createFileRoute("/_authed/tools/$toolId")({
  loader: ({ params }) => getToolById({ data: { id: params.toolId } }),
  component: ToolDetailPage,
});

function ToolDetailPage() {
  const result = Route.useLoaderData() as ToolDetailResult | null;

  if (!result) {
    return (
      <div className="container">
        <div className="empty-state" style={{ marginTop: "var(--space-2xl)" }}>
          <h2>Tool not found</h2>
          <p>This tool may have been removed.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: "var(--space-md)", display: "inline-flex" }}>
            Back to catalog
          </Link>
        </div>
      </div>
    );
  }

  const { tool } = result;

  return (
    <div className="container" style={{ paddingTop: "var(--space-lg)" }}>
      <Link to="/" style={{ fontSize: "var(--text-sm)", marginBottom: "var(--space-md)", display: "inline-block" }}>
        &larr; Back to catalog
      </Link>

      <div className="tool-detail">
        {tool.photo_url ? (
          <img src={tool.photo_url} alt={tool.name} className="tool-detail-photo" />
        ) : (
          <div className="tool-detail-photo tool-card-placeholder">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
        )}

        <div className="tool-detail-info">
          <h1 className="text-display" style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--space-sm)" }}>
            {tool.name}
          </h1>

          <StatusSection tool={tool} />

          {tool.description && (
            <p style={{ color: "var(--muted)", marginTop: "var(--space-md)", lineHeight: 1.6 }}>
              {tool.description}
            </p>
          )}

          <dl className="tool-detail-meta">
            <div>
              <dt>Owner</dt>
              <dd>{tool.owner_name}</dd>
            </div>
            {tool.category && (
              <div>
                <dt>Category</dt>
                <dd>{tool.category}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}

function StatusSection({ tool }: { tool: ToolWithLoan }) {
  if (tool.status === "checked_out") {
    const returnDate = tool.expected_return
      ? new Date(tool.expected_return).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : null;

    return (
      <div>
        <span className="badge badge-checked-out">Checked Out</span>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--muted)", marginTop: "var(--space-xs)" }}>
          Borrowed by {tool.borrower_name}
          {returnDate ? ` \u00B7 expected back ${returnDate}` : ""}
        </p>
      </div>
    );
  }

  return <span className="badge badge-available">Available</span>;
}
