import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { requestMagicLink, getCurrentUser } from "~/server/auth";
import { redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    // If already logged in, redirect to home
    const user = await getCurrentUser();
    if (user) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "not_allowed" | "error"
  >("idle");

  const requestLink = useServerFn(requestMagicLink);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("sending");
    try {
      const result = await requestLink({ data: { email } });
      if (result.ok) {
        setStatus("sent");
      } else if (result.error === "not_on_allowlist") {
        setStatus("not_allowed");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="container" style={{ paddingTop: "var(--space-3xl)" }}>
      <div
        style={{
          maxWidth: "400px",
          marginInline: "auto",
        }}
      >
        <h1
          className="text-display"
          style={{
            fontSize: "var(--text-3xl)",
            marginBottom: "var(--space-sm)",
            textAlign: "center",
          }}
        >
          Sign in
        </h1>
        <p
          className="text-muted"
          style={{
            textAlign: "center",
            marginBottom: "var(--space-xl)",
          }}
        >
          Enter your email to get a login link.
        </p>

        {status === "sent" ? (
          <div className="card" style={{ textAlign: "center" }}>
            <h2
              style={{
                fontSize: "var(--text-lg)",
                marginBottom: "var(--space-sm)",
              }}
            >
              Check your email
            </h2>
            <p className="text-muted">
              We sent a login link to <strong>{email}</strong>. It expires in 15
              minutes.
            </p>
          </div>
        ) : status === "not_allowed" ? (
          <div className="card" style={{ textAlign: "center" }}>
            <h2
              style={{
                fontSize: "var(--text-lg)",
                marginBottom: "var(--space-sm)",
              }}
            >
              Not a member yet
            </h2>
            <p className="text-muted">
              This email isn't on the Highlands2 member list. If you're a
              resident, contact your neighborhood admin to get added.
            </p>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: "var(--space-md)" }}
              onClick={() => {
                setStatus("idle");
                setEmail("");
              }}
            >
              Try another email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                marginBottom: "var(--space-xs)",
              }}
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />

            {status === "error" && (
              <p
                className="input-message input-message-error"
                style={{ marginTop: "var(--space-sm)" }}
              >
                Something went wrong. Please try again.
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={status === "sending"}
              style={{
                width: "100%",
                marginTop: "var(--space-md)",
              }}
            >
              {status === "sending" ? "Sending..." : "Send login link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
