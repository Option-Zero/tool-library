import { useState, useRef } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createTool, uploadImage } from "~/server/tools";
import { identifySingleTool } from "~/server/ai";

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

export const Route = createFileRoute("/_authed/my-tools/add")({
  component: AddToolPage,
});

function AddToolPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doCreate = useServerFn(createTool);
  const doUpload = useServerFn(uploadImage);
  const doIdentify = useServerFn(identifySingleTool);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPhotoPreview(dataUrl);
      const base64 = dataUrl.split(",")[1];
      setPhotoBase64(base64);

      // AI identify
      setAiLoading(true);
      try {
        const result = await doIdentify({ data: { image_base64: base64 } });
        if (result.ok) {
          if (!name) setName(result.name);
          if (!category) setCategory(result.category);
          if (!description) setDescription(result.description);
        }
      } catch {
        // AI failed silently — user can fill in manually
      } finally {
        setAiLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      let photo_url: string | undefined;

      if (photoBase64) {
        const uploadResult = await doUpload({
          data: { base64: photoBase64, filename: `${name.replace(/\s+/g, "-").toLowerCase()}.jpg` },
        });
        photo_url = uploadResult.url;
      }

      await doCreate({
        data: {
          name,
          description: description || undefined,
          category: category || undefined,
          photo_url,
        },
      });

      router.navigate({ to: "/my-tools" });
    } catch (err) {
      setError((err as Error).message || "Failed to save tool");
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
          Add a tool
        </h1>

        <form onSubmit={handleSubmit}>
          {/* Photo */}
          <div style={{ marginBottom: "var(--space-lg)" }}>
            <label
              style={{
                display: "block",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                marginBottom: "var(--space-xs)",
              }}
            >
              Photo (optional)
            </label>
            {photoPreview ? (
              <div style={{ position: "relative", marginBottom: "var(--space-sm)" }}>
                <img
                  src={photoPreview}
                  alt="Tool preview"
                  style={{
                    width: "100%",
                    maxHeight: 300,
                    objectFit: "cover",
                    borderRadius: "var(--radius-md)",
                  }}
                />
                {aiLoading && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(0,0,0,0.5)",
                      borderRadius: "var(--radius-md)",
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  >
                    Identifying tool...
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: "var(--space-xs)" }}
                  onClick={() => {
                    setPhotoPreview(null);
                    setPhotoBase64(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Remove photo
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: "100%" }}
                onClick={() => fileRef.current?.click()}
              >
                Take photo or choose from gallery
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhoto}
              style={{ display: "none" }}
            />
          </div>

          {/* Name */}
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
              placeholder="e.g. Circular Saw"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Category */}
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

          {/* Description */}
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
              placeholder="Brand, size, any notes for borrowers..."
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
              {saving ? "Saving..." : "Add tool"}
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
