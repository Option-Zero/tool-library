import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getOwnerTools, updateTool, deleteTool } from "~/server/tools";
import type { OwnerTool, OwnerDashboardResult } from "~/server/tools";

export const Route = createFileRoute("/_authed/my-tools")({
  loader: () => getOwnerTools(),
  component: MyToolsPage,
});

function MyToolsPage() {
  const data = Route.useLoaderData() as OwnerDashboardResult;
  const router = useRouter();

  return (
    <div className="container" style={{ paddingTop: "var(--space-lg)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-lg)",
          flexWrap: "wrap",
          gap: "var(--space-sm)",
        }}
      >
        <h1
          className="text-display"
          style={{ fontSize: "var(--text-2xl)" }}
        >
          My Tools
        </h1>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          <Link to="/my-tools/add" className="btn btn-primary">
            Add tool
          </Link>
          <Link to="/my-tools/bulk-add" className="btn btn-secondary">
            Scan tool wall
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--space-sm)",
          marginBottom: "var(--space-xl)",
        }}
      >
        <StatCard label="Total" value={data.stats.total} />
        <StatCard label="Lent out" value={data.stats.lent_out} />
        <StatCard label="All-time loans" value={data.stats.total_loans} />
      </div>

      {/* Tool list */}
      {data.tools.length === 0 ? (
        <div className="empty-state">
          <h2>No tools yet</h2>
          <p>Add your first tool or scan your tool wall with AI.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          {data.tools.map((tool) => (
            <OwnerToolCard
              key={tool.id}
              tool={tool}
              onUpdate={() => router.invalidate()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "var(--space-md)" }}>
      <div
        className="text-display"
        style={{ fontSize: "var(--text-2xl)", color: "var(--accent-on-bg)" }}
      >
        {value}
      </div>
      <div
        className="text-muted"
        style={{ fontSize: "var(--text-sm)", marginTop: "var(--space-2xs)" }}
      >
        {label}
      </div>
    </div>
  );
}

function OwnerToolCard({
  tool,
  onUpdate,
}: {
  tool: OwnerTool;
  onUpdate: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [acting, setActing] = useState(false);
  const doUpdate = useServerFn(updateTool);
  const doDelete = useServerFn(deleteTool);

  async function toggleStatus() {
    setActing(true);
    try {
      await doUpdate({
        data: {
          id: tool.id,
          status: tool.status === "disabled" ? "available" : "disabled",
        },
      });
      onUpdate();
    } finally {
      setActing(false);
    }
  }

  async function handleDelete() {
    setActing(true);
    try {
      await doDelete({ data: { id: tool.id } });
      onUpdate();
    } finally {
      setActing(false);
      setConfirming(false);
    }
  }

  return (
    <div className="card" style={{ display: "flex", gap: "var(--space-md)", alignItems: "flex-start" }}>
      {/* Thumbnail */}
      {tool.photo_url ? (
        <img
          src={tool.photo_url}
          alt={tool.name}
          style={{
            width: 64,
            height: 64,
            objectFit: "cover",
            borderRadius: "var(--radius-sm)",
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--surface-raised)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "var(--muted)",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-2xs)" }}>
          <strong style={{ fontSize: "var(--text-base)" }}>{tool.name}</strong>
          {tool.status === "disabled" ? (
            <span className="badge badge-unavailable">Disabled</span>
          ) : tool.status === "checked_out" ? (
            <span className="badge badge-checked-out">Checked out</span>
          ) : (
            <span className="badge badge-available">Available</span>
          )}
        </div>

        {tool.borrower_name && (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--muted)" }}>
            With {tool.borrower_name}
            {tool.borrower_phone ? ` · ${tool.borrower_phone}` : ""}
          </p>
        )}

        {tool.category && (
          <p style={{ fontSize: "var(--text-xs)", color: "var(--muted)", marginTop: "var(--space-2xs)" }}>
            {tool.category}
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "var(--space-xs)", flexShrink: 0 }}>
        <Link
          to="/my-tools/edit/$toolId"
          params={{ toolId: tool.id }}
          className="btn btn-ghost btn-sm"
        >
          Edit
        </Link>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={acting || tool.status === "checked_out"}
          onClick={toggleStatus}
        >
          {tool.status === "disabled" ? "Enable" : "Disable"}
        </button>
        {confirming ? (
          <button
            type="button"
            className="btn btn-sm"
            style={{ backgroundColor: "var(--error)", color: "#fff", borderColor: "var(--error)" }}
            disabled={acting}
            onClick={handleDelete}
          >
            Confirm
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={acting || tool.status === "checked_out"}
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
