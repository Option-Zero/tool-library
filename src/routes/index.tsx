import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="container" style={{ paddingTop: "var(--space-lg)" }}>
      <h1
        className="text-display"
        style={{ fontSize: "var(--text-3xl)", marginBottom: "var(--space-sm)" }}
      >
        Find a tool
      </h1>
      <p
        className="text-muted"
        style={{
          fontSize: "var(--text-lg)",
          marginBottom: "var(--space-lg)",
        }}
      >
        Borrow what you need from your neighbors.
      </p>

      <div style={{ marginBottom: "var(--space-lg)" }}>
        <input
          type="search"
          className="input"
          placeholder="Search tools..."
          aria-label="Search tools"
        />
      </div>

      <div className="tool-grid">
        {["Circular Saw", "Drill Press", "Hedge Trimmer"].map((name) => (
          <div key={name} className="card">
            <div
              className="skeleton"
              style={{
                height: "140px",
                marginBottom: "var(--space-sm)",
                borderRadius: "var(--radius-sm)",
              }}
            />
            <h3
              style={{
                fontSize: "var(--text-base)",
                fontWeight: 600,
                marginBottom: "var(--space-xs)",
              }}
            >
              {name}
            </h3>
            <span className="badge badge-available">Available</span>
          </div>
        ))}
      </div>
    </div>
  );
}
