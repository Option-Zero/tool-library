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

const WEBMAIL_PROVIDERS: Record<string, { name: string; url: string }> = {
  "gmail.com": { name: "Gmail", url: "https://mail.google.com" },
  "googlemail.com": { name: "Gmail", url: "https://mail.google.com" },
  "outlook.com": { name: "Outlook", url: "https://outlook.live.com" },
  "hotmail.com": { name: "Outlook", url: "https://outlook.live.com" },
  "live.com": { name: "Outlook", url: "https://outlook.live.com" },
  "yahoo.com": { name: "Yahoo Mail", url: "https://mail.yahoo.com" },
  "icloud.com": { name: "iCloud Mail", url: "https://www.icloud.com/mail" },
  "me.com": { name: "iCloud Mail", url: "https://www.icloud.com/mail" },
  "mac.com": { name: "iCloud Mail", url: "https://www.icloud.com/mail" },
  "proton.me": { name: "Proton Mail", url: "https://mail.proton.me" },
  "protonmail.com": { name: "Proton Mail", url: "https://mail.proton.me" },
  "aol.com": { name: "AOL Mail", url: "https://mail.aol.com" },
};

function getWebmailProvider(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? WEBMAIL_PROVIDERS[domain] ?? null : null;
}

const WEBMAIL_ICONS: Record<string, React.ReactNode> = {
  Gmail: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M2 6l10 7 10-7v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" fill="#EA4335" opacity="0.15" />
      <path d="M22 6l-10 7L2 6" stroke="#EA4335" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="#EA4335" strokeWidth="2" fill="none" />
    </svg>
  ),
  Outlook: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M2 6l10 7 10-7v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" fill="#0078D4" opacity="0.15" />
      <path d="M22 6l-10 7L2 6" stroke="#0078D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="#0078D4" strokeWidth="2" fill="none" />
    </svg>
  ),
  "Yahoo Mail": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M2 6l10 7 10-7v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" fill="#6001D2" opacity="0.15" />
      <path d="M22 6l-10 7L2 6" stroke="#6001D2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="#6001D2" strokeWidth="2" fill="none" />
    </svg>
  ),
  "iCloud Mail": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M2 6l10 7 10-7v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" fill="#3693F3" opacity="0.15" />
      <path d="M22 6l-10 7L2 6" stroke="#3693F3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="#3693F3" strokeWidth="2" fill="none" />
    </svg>
  ),
  "Proton Mail": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M2 6l10 7 10-7v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" fill="#6D4AFF" opacity="0.15" />
      <path d="M22 6l-10 7L2 6" stroke="#6D4AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="#6D4AFF" strokeWidth="2" fill="none" />
    </svg>
  ),
  "AOL Mail": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M2 6l10 7 10-7v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" fill="#39739D" opacity="0.15" />
      <path d="M22 6l-10 7L2 6" stroke="#39739D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="#39739D" strokeWidth="2" fill="none" />
    </svg>
  ),
};

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
            {(() => {
              const provider = getWebmailProvider(email);
              if (!provider) return null;
              return (
                <a
                  href={provider.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{
                    marginTop: "var(--space-md)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--space-xs)",
                  }}
                >
                  {WEBMAIL_ICONS[provider.name]}
                  Open {provider.name}
                </a>
              );
            })()}
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
