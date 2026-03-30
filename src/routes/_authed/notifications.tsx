import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  getNotifications,
  markNotificationsRead,
  subscribePush,
  unsubscribePush,
  getVapidPublicKey,
  type AppNotification,
} from "~/server/notifications";

export const Route = createFileRoute("/_authed/notifications")({
  loader: () => getNotifications(),
  component: NotificationsPage,
});

function NotificationsPage() {
  const initial = Route.useLoaderData();
  const [notifications, setNotifications] = useState<AppNotification[]>(
    initial.notifications,
  );
  const [unread, setUnread] = useState(initial.unread);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  const doMarkRead = useServerFn(markNotificationsRead);
  const doSubscribe = useServerFn(subscribePush);
  const doUnsubscribe = useServerFn(unsubscribePush);
  const doGetVapidKey = useServerFn(getVapidPublicKey);

  // Check current push subscription status
  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setPushEnabled(!!sub);
        });
      });
    }
  }, []);

  async function handleMarkAllRead() {
    await doMarkRead({ data: { all: true } });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
    setUnread(0);
  }

  async function handleMarkRead(id: string) {
    await doMarkRead({ data: { ids: [id] } });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: 1 } : n)),
    );
    setUnread((prev) => Math.max(0, prev - 1));
  }

  async function togglePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      if (pushEnabled) {
        // Unsubscribe
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await doUnsubscribe({ data: { endpoint: sub.endpoint } });
          await sub.unsubscribe();
        }
        setPushEnabled(false);
      } else {
        // Subscribe
        const { key } = await doGetVapidKey();
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });

        const json = sub.toJSON();
        await doSubscribe({
          data: {
            endpoint: sub.endpoint,
            p256dh: json.keys?.p256dh ?? "",
            auth: json.keys?.auth ?? "",
          },
        });
        setPushEnabled(true);
      }
    } catch (err) {
      console.error("Push toggle failed:", err);
    } finally {
      setPushLoading(false);
    }
  }

  function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr + "Z").getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div className="container" style={{ paddingTop: "var(--space-lg)" }}>
      <div style={{ maxWidth: 600, marginInline: "auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-lg)",
          }}
        >
          <h1
            className="text-display"
            style={{ fontSize: "var(--text-2xl)", margin: 0 }}
          >
            Notifications
          </h1>
          {unread > 0 && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: "var(--text-sm)" }}
              onClick={handleMarkAllRead}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Push toggle */}
        <div
          className="card"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-lg)",
          }}
        >
          <div>
            <p style={{ fontWeight: 600, margin: 0 }}>Push notifications</p>
            <p
              className="text-muted"
              style={{ fontSize: "var(--text-sm)", margin: 0 }}
            >
              {pushEnabled
                ? "You'll get alerts on this device"
                : "Enable to get alerts on this device"}
            </p>
          </div>
          <button
            type="button"
            className={`btn ${pushEnabled ? "btn-ghost" : "btn-primary"}`}
            style={{ fontSize: "var(--text-sm)" }}
            disabled={
              pushLoading ||
              !("PushManager" in (typeof window !== "undefined" ? window : {}))
            }
            onClick={togglePush}
          >
            {pushLoading
              ? "..."
              : pushEnabled
                ? "Disable"
                : "Enable"}
          </button>
        </div>

        {/* Notification list */}
        {notifications.length === 0 ? (
          <div className="empty-state">
            <p className="text-muted">No notifications yet</p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-xs)",
            }}
          >
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                className="card"
                onClick={() => {
                  if (!n.read) handleMarkRead(n.id);
                  if (n.action_url) window.location.href = n.action_url;
                }}
                style={{
                  textAlign: "left",
                  cursor: n.action_url ? "pointer" : "default",
                  opacity: n.read ? 0.7 : 1,
                  borderLeft: n.read
                    ? "3px solid transparent"
                    : "3px solid var(--accent)",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "var(--space-sm)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontWeight: n.read ? 400 : 600,
                        margin: 0,
                        fontSize: "var(--text-sm)",
                      }}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <p
                        className="text-muted"
                        style={{
                          margin: 0,
                          fontSize: "var(--text-xs)",
                          marginTop: 2,
                        }}
                      >
                        {n.body}
                      </p>
                    )}
                  </div>
                  <span
                    className="text-muted"
                    style={{
                      fontSize: "var(--text-xs)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {timeAgo(n.created_at)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Convert URL-safe base64 to Uint8Array for applicationServerKey. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
