import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTreeboAuth } from "@/lib/treebo-auth-middleware";

/** Mark a page published on a date (or unpublish with null). */
export const setPagePublished = createServerFn({ method: "POST" })
  .middleware([requireTreeboAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), publishedAt: z.string().datetime().nullable(), simulated: z.boolean().default(false) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("pages").update({ published_at: data.publishedAt, publish_simulated: data.publishedAt ? data.simulated : false }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
