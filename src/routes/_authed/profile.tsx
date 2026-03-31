import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { logout } from "~/server/auth";

export const Route = createFileRoute("/_authed/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const doLogout = useServerFn(logout);

  async function handleLogout() {
    await doLogout();
    router.invalidate();
  }

  return (
    <div className="container" style={{ paddingTop: "var(--space-lg)" }}>
      <h1
        className="text-display"
        style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--space-lg)" }}
      >
        Profile
      </h1>

      <div className="card" style={{ marginBottom: "var(--space-md)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          <div>
            <div
              className="text-muted"
              style={{ fontSize: "var(--text-xs)", marginBottom: "var(--space-2xs)" }}
            >
              Name
            </div>
            <div style={{ fontSize: "var(--text-base)" }}>{user.name}</div>
          </div>

          <div>
            <div
              className="text-muted"
              style={{ fontSize: "var(--text-xs)", marginBottom: "var(--space-2xs)" }}
            >
              Email
            </div>
            <div style={{ fontSize: "var(--text-base)" }}>{user.email}</div>
          </div>

          {user.phone && (
            <div>
              <div
                className="text-muted"
                style={{ fontSize: "var(--text-xs)", marginBottom: "var(--space-2xs)" }}
              >
                Phone
              </div>
              <div style={{ fontSize: "var(--text-base)" }}>{user.phone}</div>
            </div>
          )}

          {user.address && (
            <div>
              <div
                className="text-muted"
                style={{ fontSize: "var(--text-xs)", marginBottom: "var(--space-2xs)" }}
              >
                Address
              </div>
              <div style={{ fontSize: "var(--text-base)" }}>{user.address}</div>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        className="btn btn-secondary"
        onClick={handleLogout}
        style={{ width: "100%" }}
      >
        Sign out
      </button>
    </div>
  );
}
