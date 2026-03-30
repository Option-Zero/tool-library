import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getTools } from "~/api/tools";
import type { ToolListResult } from "~/types/tool";
import ToolCard, { ToolCardSkeleton } from "~/components/ToolCard";
import CategoryPills from "~/components/CategoryPills";

export const Route = createFileRoute("/_authed/")({
  loader: () => getTools({ data: {} }),
  component: CatalogPage,
});

function CatalogPage() {
  const initialData = Route.useLoaderData() as ToolListResult;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  async function search(q: string, cat: string | undefined) {
    setLoading(true);
    try {
      const result = await getTools({
        data: { q: q || undefined, category: cat },
      });
      setData(result);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    search(query, category);
  }

  function handleCategorySelect(cat: string | undefined) {
    setCategory(cat);
    search(query, cat);
  }

  return (
    <div className="container">
      <section className="search-hero">
        <h1>Find a tool</h1>
        <form onSubmit={handleSearch}>
          <input
            type="search"
            className="input"
            placeholder="Search tools..."
            aria-label="Search tools"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
      </section>

      <CategoryPills
        categories={data.categories}
        active={category}
        onSelect={handleCategorySelect}
      />

      <section
        style={{ marginTop: "var(--space-lg)" }}
        aria-label="Tool catalog"
        aria-live="polite"
      >
        {loading ? (
          <div className="tool-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <ToolCardSkeleton key={i} />
            ))}
          </div>
        ) : data.tools.length === 0 ? (
          <div className="empty-state">
            <h2>No tools found</h2>
            <p>
              {query
                ? "Try a different search term or clear the filters."
                : "No tools have been listed yet."}
            </p>
          </div>
        ) : (
          <div className="tool-grid">
            {data.tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
