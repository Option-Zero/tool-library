import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="container">
      <header className="hero">
        <h1>Tool Library</h1>
        <p className="subtitle">
          Borrow tools from your neighbors in Highlands2
        </p>
      </header>
      <main>
        <div className="empty-state">
          <h2>Coming soon</h2>
          <p>The neighborhood tool library is being built.</p>
        </div>
      </main>
    </div>
  );
}
