import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "~/server/auth";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUser();
    if (!user) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
    return { user };
  },
  component: () => <Outlet />,
});
