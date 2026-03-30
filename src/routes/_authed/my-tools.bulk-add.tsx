import { useState, useRef } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { identifyTools, type IdentifiedTool } from "~/server/ai";
import { batchCreateTools, uploadImage } from "~/server/tools";

export const Route = createFileRoute("/_authed/my-tools/bulk-add")({
  component: BulkAddPage,
});

type ReviewTool = IdentifiedTool & {
  selected: boolean;
  edited_name: string;
  edited_category: string;
  edited_description: string;
};

function BulkAddPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<"capture" | "scanning" | "review" | "saving" | "done" | "error">("capture");
  const [tools, setTools] = useState<ReviewTool[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  const doIdentify = useServerFn(identifyTools);
  const doBatch = useServerFn(batchCreateTools);
  const doUpload = useServerFn(uploadImage);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPhotoPreview(dataUrl);
      const base64 = dataUrl.split(",")[1];
      setPhotoBase64(base64);

      // Start scanning
      setPhase("scanning");
      try {
        const result = await doIdentify({ data: { image_base64: base64 } });
        if (result.ok && result.tools.length > 0) {
          setTools(
            result.tools.map((t) => ({
              ...t,
              selected: t.confidence >= 0.5,
              edited_name: t.name,
              edited_category: t.category,
              edited_description: t.description,
            })),
          );
          setPhase("review");
        } else if (result.ok && result.tools.length === 0) {
          setErrorMsg("No tools identified in this photo. Try a clearer angle or closer shot.");
          setPhase("error");
        } else if (!result.ok) {
          setErrorMsg(result.error);
          setPhase("error");
        }
      } catch {
        setErrorMsg("AI couldn't identify tools — add them manually");
        setPhase("error");
      }
    };
    reader.readAsDataURL(file);
  }

  function toggleTool(index: number) {
    setTools((prev) =>
      prev.map((t, i) => (i === index ? { ...t, selected: !t.selected } : t)),
    );
  }

  function updateTool(index: number, field: "edited_name" | "edited_category" | "edited_description", value: string) {
    setTools((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    );
  }

  async function handleSave() {
    const selected = tools.filter((t) => t.selected);
    if (selected.length === 0) return;

    setPhase("saving");

    try {
      // Upload the source photo once
      let photo_url: string | undefined;
      if (photoBase64) {
        const uploadResult = await doUpload({
          data: { base64: photoBase64, filename: `bulk-intake-${Date.now()}.jpg` },
        });
        photo_url = uploadResult.url;
      }

      await doBatch({
        data: selected.map((t) => ({
          name: t.edited_name,
          description: t.edited_description || undefined,
          category: t.edited_category || undefined,
          photo_url,
          ai_metadata: JSON.stringify({
            bounding_box: t.bounding_box,
            confidence: t.confidence,
            original_name: t.name,
          }),
        })),
      });

      setSavedCount(selected.length);
      setPhase("done");
    } catch {
      setErrorMsg("Failed to save tools. Please try again.");
      setPhase("error");
    }
  }

  const selectedCount = tools.filter((t) => t.selected).length;

  return (
    <div className="container" style={{ paddingTop: "var(--space-lg)" }}>
      <div style={{ maxWidth: 700, marginInline: "auto" }}>
        <h1
          className="text-display"
          style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--space-sm)" }}
        >
          Scan your tool wall
        </h1>
        <p className="text-muted" style={{ marginBottom: "var(--space-lg)" }}>
          Take a photo of your tools and AI will identify them for you.
        </p>

        {/* Capture phase */}
        {phase === "capture" && (
          <>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%", minHeight: 120 }}
              onClick={() => fileRef.current?.click()}
            >
              Take a photo of your tools
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhoto}
              style={{ display: "none" }}
            />
          </>
        )}

        {/* Scanning phase */}
        {phase === "scanning" && (
          <div style={{ textAlign: "center" }}>
            {photoPreview && (
              <img
                src={photoPreview}
                alt="Scanning"
                style={{
                  width: "100%",
                  maxHeight: 400,
                  objectFit: "contain",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "var(--space-md)",
                  opacity: 0.7,
                }}
              />
            )}
            <p style={{ fontWeight: 600 }}>Identifying tools...</p>
            <p className="text-muted" style={{ fontSize: "var(--text-sm)" }}>
              This may take a few seconds
            </p>
          </div>
        )}

        {/* Review phase */}
        {phase === "review" && (
          <>
            {/* Photo with bounding boxes */}
            {photoPreview && (
              <div style={{ position: "relative", marginBottom: "var(--space-lg)" }}>
                <img
                  src={photoPreview}
                  alt="Tool wall"
                  style={{
                    width: "100%",
                    borderRadius: "var(--radius-md)",
                    display: "block",
                  }}
                />
                {tools.map((tool, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleTool(i)}
                    title={tool.edited_name}
                    style={{
                      position: "absolute",
                      left: `${tool.bounding_box.x}%`,
                      top: `${tool.bounding_box.y}%`,
                      width: `${tool.bounding_box.width}%`,
                      height: `${tool.bounding_box.height}%`,
                      border: `2px solid ${tool.selected ? "var(--success)" : "var(--muted)"}`,
                      backgroundColor: tool.selected
                        ? "rgba(74, 111, 92, 0.15)"
                        : "rgba(0,0,0,0.1)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            )}

            <p style={{ marginBottom: "var(--space-md)", fontWeight: 600 }}>
              Found {tools.length} tool{tools.length !== 1 ? "s" : ""} — {selectedCount} selected
            </p>

            {/* Tool review list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)", marginBottom: "var(--space-lg)" }}>
              {tools.map((tool, i) => (
                <div
                  key={i}
                  className="card"
                  style={{
                    opacity: tool.selected ? 1 : 0.5,
                    display: "flex",
                    gap: "var(--space-md)",
                    alignItems: "flex-start",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={tool.selected}
                    onChange={() => toggleTool(i)}
                    style={{ marginTop: 4, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      type="text"
                      className="input"
                      value={tool.edited_name}
                      onChange={(e) => updateTool(i, "edited_name", e.target.value)}
                      style={{ marginBottom: "var(--space-xs)", fontWeight: 600 }}
                    />
                    <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap" }}>
                      <select
                        className="input"
                        value={tool.edited_category}
                        onChange={(e) => updateTool(i, "edited_category", e.target.value)}
                        style={{ flex: "1 1 150px" }}
                      >
                        <option value="">Category</option>
                        {[
                          "Power Tools", "Hand Tools", "Garden Tools", "Measuring",
                          "Safety", "Fastening", "Plumbing", "Electrical",
                          "Painting", "Woodworking", "Automotive", "Other",
                        ].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <span
                        className="text-muted"
                        style={{ fontSize: "var(--text-xs)", alignSelf: "center" }}
                      >
                        {Math.round(tool.confidence * 100)}% conf
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "var(--space-sm)" }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={selectedCount === 0}
                onClick={handleSave}
              >
                Add {selectedCount} tool{selectedCount !== 1 ? "s" : ""}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setPhase("capture");
                  setTools([]);
                  setPhotoBase64(null);
                  setPhotoPreview(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              >
                Retake
              </button>
            </div>
          </>
        )}

        {/* Saving phase */}
        {phase === "saving" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 600 }}>Saving {selectedCount} tools...</p>
          </div>
        )}

        {/* Done phase */}
        {phase === "done" && (
          <div className="card" style={{ textAlign: "center" }}>
            <h2 style={{ marginBottom: "var(--space-sm)" }}>
              {savedCount} tool{savedCount !== 1 ? "s" : ""} added
            </h2>
            <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "center", marginTop: "var(--space-md)" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => router.navigate({ to: "/my-tools" })}
              >
                View my tools
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setPhase("capture");
                  setTools([]);
                  setPhotoBase64(null);
                  setPhotoPreview(null);
                  setSavedCount(0);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              >
                Scan more
              </button>
            </div>
          </div>
        )}

        {/* Error phase */}
        {phase === "error" && (
          <div className="card" style={{ textAlign: "center" }}>
            <h2 style={{ marginBottom: "var(--space-sm)" }}>
              Couldn't identify tools
            </h2>
            <p className="text-muted">{errorMsg}</p>
            <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "center", marginTop: "var(--space-md)" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setPhase("capture");
                  setTools([]);
                  setPhotoBase64(null);
                  setPhotoPreview(null);
                  setErrorMsg("");
                  if (fileRef.current) fileRef.current.value = "";
                }}
              >
                Try again
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => router.navigate({ to: "/my-tools/add" })}
              >
                Add manually
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
