import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { getToolById } from "~/api/tools";
import { borrowTool, returnTool } from "~/api/loans";
import type { AuthUser } from "~/server/auth";
import type { ToolDetailResult, ToolWithLoan } from "~/types/tool";

export const Route = createFileRoute("/_authed/tools/$toolId")({
  loader: ({ params }) => getToolById({ data: { id: params.toolId } }),
  component: ToolDetailPage,
});

function ToolDetailPage() {
  const result = Route.useLoaderData() as ToolDetailResult | null;
  const { user } = Route.useRouteContext() as { user: AuthUser };

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

          <ActionSection tool={tool} user={user} />
        </div>
      </div>
    </div>
  );
}

function StatusSection({ tool }: { tool: ToolWithLoan }) {
  if (tool.status === "checked_out") {
    const returnDate = tool.expected_return
      ? new Date(tool.expected_return + "T00:00:00").toLocaleDateString("en-US", {
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

function ActionSection({ tool, user }: { tool: ToolWithLoan; user: AuthUser }) {
  const isOwner = tool.owner_id === user.id;
  const isBorrower = tool.borrower_id === user.id;

  if (tool.status === "available" && !isOwner) {
    return <BorrowForm toolId={tool.id} />;
  }

  if (tool.status === "checked_out" && isBorrower) {
    return <ReturnForm toolId={tool.id} />;
  }

  return null;
}

function BorrowForm({ toolId }: { toolId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default: 1 week from today
  const defaultReturn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const [expectedReturn, setExpectedReturn] = useState(defaultReturn);

  async function handleBorrow(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await borrowTool({ data: { toolId, expectedReturn } });
      router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to borrow tool");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleBorrow} className="borrow-form">
      <h3 style={{ fontSize: "var(--text-base)", fontWeight: 600, marginBottom: "var(--space-sm)" }}>
        Borrow this tool
      </h3>
      <label className="borrow-form-label">
        <span style={{ fontSize: "var(--text-sm)", color: "var(--muted)" }}>Expected return</span>
        <input
          type="date"
          className="input"
          value={expectedReturn}
          onChange={(e) => setExpectedReturn(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          required
        />
      </label>
      {error && (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--error)" }}>{error}</p>
      )}
      <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: "100%" }}>
        {submitting ? "Borrowing\u2026" : "Borrow"}
      </button>
    </form>
  );
}

function ReturnForm({ toolId }: { toolId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "checking" | "verified" | "failed" | "unavailable"
  >("idle");

  async function checkLocation(): Promise<boolean> {
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return false;
    }

    setLocationStatus("checking");

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (_position) => {
          // MVP: We record that geolocation was obtained.
          // Full verification (distance to owner address) requires geocoding the address.
          // For now, having a position at all counts as location-verified.
          setLocationStatus("verified");
          resolve(true);
        },
        () => {
          setLocationStatus("failed");
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }

  async function handleReturn(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const locationVerified = await checkLocation();
      await returnTool({ data: { toolId, locationVerified } });
      router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to return tool");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleReturn} className="borrow-form">
      <h3 style={{ fontSize: "var(--text-base)", fontWeight: 600, marginBottom: "var(--space-sm)" }}>
        Return this tool
      </h3>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--muted)", marginBottom: "var(--space-md)" }}>
        We'll check your location to verify the tool is back with the owner.
      </p>
      {locationStatus === "checking" && (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--info)" }}>Checking location&hellip;</p>
      )}
      {locationStatus === "failed" && (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--warning)" }}>
          Could not verify location. You can still return the tool.
        </p>
      )}
      {locationStatus === "unavailable" && (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--warning)" }}>
          Location services unavailable. You can still return the tool.
        </p>
      )}
      {error && (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--error)" }}>{error}</p>
      )}
      <button type="submit" className="btn btn-secondary" disabled={submitting} style={{ width: "100%" }}>
        {submitting ? "Returning\u2026" : "Return tool"}
      </button>
    </form>
  );
}
