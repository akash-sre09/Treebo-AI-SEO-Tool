import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isTreeboEmail } from "@/lib/treebo-auth";

/** Requires a valid session and re-checks the company domain on every server-function call. */
export const requireTreeboAuth = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const email = context.claims.email;
    if (!isTreeboEmail(email)) {
      throw new Error("Unauthorized: only @treebo.com accounts can use this app");
    }
    return next({ context: { treeboEmail: email.trim().toLowerCase() } });
  });
