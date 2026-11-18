import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility entry point used by the managed authentication gate. */
export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => (
    typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {}
  ),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/login", search: search.redirect ? { redirect: search.redirect } : {}, replace: true });
  },
});
