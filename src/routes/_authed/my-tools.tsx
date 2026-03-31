import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/my-tools")({
  component: MyToolsLayout,
});

function MyToolsLayout() {
  return <Outlet />;
}
