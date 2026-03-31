import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "~/server/auth";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ location }) => {
    console.error(`[_authed] beforeLoad: location=${location.href}`);
    const user = await getCurrentUser();
    console.error(`[_authed] beforeLoad: user=${user ? user.email : "null"}`);
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
