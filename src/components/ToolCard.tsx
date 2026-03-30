import { Link } from "@tanstack/react-router";
import type { ToolWithLoan } from "~/types/tool";

function StatusBadge({ tool }: { tool: ToolWithLoan }) {
  if (tool.status === "checked_out") {
    const returnDate = tool.expected_return
      ? new Date(tool.expected_return).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : null;
    return (
      <span className="badge badge-checked-out">
        Checked Out
        {returnDate ? ` \u00B7 back ${returnDate}` : ""}
      </span>
    );
  }
  return <span className="badge badge-available">Available</span>;
}

export default function ToolCard({ tool }: { tool: ToolWithLoan }) {
  const firstName = tool.owner_name.split(" ")[0];

  return (
    <Link
      to="/tools/$toolId"
      params={{ toolId: tool.id }}
      className="card tool-card"
    >
      {tool.photo_url ? (
        <img
          src={tool.photo_url}
          alt={tool.name}
          className="tool-card-photo"
          loading="lazy"
        />
      ) : (
        <div className="tool-card-photo tool-card-placeholder" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>
      )}
      <div className="tool-card-body">
        <h3 className="tool-card-name">{tool.name}</h3>
        <p className="tool-card-owner">{firstName}</p>
        <StatusBadge tool={tool} />
      </div>
    </Link>
  );
}

export function ToolCardSkeleton() {
  return (
    <div className="card tool-card">
      <div className="tool-card-photo skeleton" />
      <div className="tool-card-body">
        <div className="skeleton" style={{ height: "1.2em", width: "70%", marginBottom: "var(--space-xs)" }} />
        <div className="skeleton" style={{ height: "0.9em", width: "40%", marginBottom: "var(--space-sm)" }} />
        <div className="skeleton" style={{ height: "1.4em", width: "5em", borderRadius: "var(--radius-full)" }} />
      </div>
    </div>
  );
}
