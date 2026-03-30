import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getToolById } from "~/api/tools";
import { updateTool } from "~/server/tools";
import type { ToolDetailResult } from "~/types/tool";

const CATEGORIES = [
  "Power Tools",
  "Hand Tools",
  "Garden Tools",
  "Measuring",
  "Safety",
  "Fastening",
  "Plumbing",
  "Electrical",
  "Painting",
  "Woodworking",
  "Automotive",
  "Other",
];

export const Route = createFileRoute("/_authed/my-tools/edit/$toolId")({
  loader: ({ params }) => getToolById({ data: { id: params.toolId } }),
  component: EditToolPage,
});

function EditToolPage() {
  const result = Route.useLoaderData() as ToolDetailResult | null;
  const router = useRouter();
  const doUpdate = useServerFn(updateTool);

  if (!result) {
    return (
      <div className="container">
        <div className="empty-state" style={{ marginTop: "var(--space-2xl)" }}>
          <h2>Tool not found</h2>
        </div>
      </div>
    );
  }

  const { tool } = result;

  const [name, setName] = useState(tool.name);
  const [description, setDescription] = useState(tool.description || "");
  const [category, setCategory] = useState(tool.category || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      await doUpdate({
        data: {
          id: tool.id,
          name,
          description,
          category,
        },
      });
      router.navigate({ to: "/my-tools" });
    } catch (err) {
      setError((err as Error).message || "Failed to update");
      setSaving(false);
    }
  }

  return (
    <div className="container" style={{ paddingTop: "var(--space-lg)" }}>
      <div style={{ maxWidth: 500, marginInline: "auto" }}>
        <h1
          className="text-display"
          style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--space-lg)" }}
        >
          Edit tool
        </h1>

        <form onSubmit={handleSubmit}>
          {tool.photo_url && (
            <img
              src={tool.photo_url}
              alt={tool.name}
              style={{
                width: "100%",
                maxHeight: 200,
                objectFit: "cover",
                borderRadius: "var(--radius-md)",
                marginBottom: "var(--space-lg)",
              }}
            />
          )}

          <div style={{ marginBottom: "var(--space-md)" }}>
            <label
              htmlFor="tool-name"
              style={{
                display: "block",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                marginBottom: "var(--space-xs)",
              }}
            >
              Tool name *
            </label>
            <input
              id="tool-name"
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: "var(--space-md)" }}>
            <label
              htmlFor="tool-category"
              style={{
                display: "block",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                marginBottom: "var(--space-xs)",
              }}
            >
              Category
            </label>
            <select
              id="tool-category"
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "var(--space-lg)" }}>
            <label
              htmlFor="tool-desc"
              style={{
                display: "block",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                marginBottom: "var(--space-xs)",
              }}
            >
              Description
            </label>
            <textarea
              id="tool-desc"
              className="input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && (
            <p
              className="input-message input-message-error"
              style={{ marginBottom: "var(--space-md)" }}
            >
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !name.trim()}
              style={{ flex: 1 }}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => router.navigate({ to: "/my-tools" })}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
