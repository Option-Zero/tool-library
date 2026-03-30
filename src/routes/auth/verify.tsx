import { createFileRoute } from "@tanstack/react-router";
import { verifyMagicToken } from "~/server/auth";

type VerifySearch = {
  token: string;
};

export const Route = createFileRoute("/auth/verify")({
  validateSearch: (search: Record<string, unknown>): VerifySearch => {
    return { token: String(search.token || "") };
  },
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: async ({ deps }) => {
    if (!deps.token) {
      return { error: "missing_token" as const };
    }

    const result = await verifyMagicToken({ data: { token: deps.token } });

    // If verifyMagicToken succeeds, it throws a redirect to "/".
    // If we get here, the token was invalid.
    return { error: result.error };
  },
  component: VerifyPage,
});

function VerifyPage() {
  const { error } = Route.useLoaderData();

  return (
    <div className="container" style={{ paddingTop: "var(--space-3xl)" }}>
      <div
        className="card"
        style={{
          maxWidth: "400px",
          marginInline: "auto",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "var(--text-lg)",
            marginBottom: "var(--space-sm)",
          }}
        >
          {error === "missing_token"
            ? "Missing token"
            : "Link expired or already used"}
        </h2>
        <p className="text-muted">
          {error === "missing_token"
            ? "This link appears to be incomplete."
            : "Magic links expire after 15 minutes and can only be used once."}
        </p>
        <a
          href="/login"
          className="btn btn-primary"
          style={{ marginTop: "var(--space-md)" }}
        >
          Request a new link
        </a>
      </div>
    </div>
  );
}
