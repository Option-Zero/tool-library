import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";

export default function NotificationBell({ unread }: { unread?: number }) {
  return (
    <Link
      to="/notifications"
      className="notification-bell"
      aria-label={
        unread ? `${unread} unread notifications` : "Notifications"
      }
    >
      <Bell size={20} />
      {unread && unread > 0 ? (
        <span className="notification-badge" aria-hidden="true">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
