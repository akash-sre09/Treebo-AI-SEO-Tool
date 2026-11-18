import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTreeboAuth } from "@/lib/treebo-auth-middleware";

/** Generates a landing page from a brief. Each call inserts a new row. */
export const generatePage = createServerFn({ method: "POST" })
  .middleware([requireTreeboAuth])
  .inputValidator((d: unknown) => z.object({ briefId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error("AI is not configured");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("briefs").select("*").eq("id", data.briefId).single();
    if (error) throw new Error(error.message);
    const brief = row.brief as never as import("@/lib/briefcheck").BriefContent & { area: string; intent: string | null };
    const city = row.city as "Bangalore" | "Pune";
    const { writePageCopy } = await import("@/lib/ai/engines.server");
    const { buildLandingHtml } = await import("@/lib/landing");
    const copy = await writePageCopy(key, `Page: ${row.slug}\nCity: ${city}\nArea: ${brief.area}\nIntent: ${brief.intent ?? "general"}\nH1: ${brief.h1}\nIntro angle: ${brief.introAngle}\nSections: ${brief.h2Outline.join("; ")}\nKeywords: ${brief.targetKeywords.join(", ")}`);
    const html = buildLandingHtml({ city, area: brief.area, slug: row.slug, brief, copy });
    const { data: page, error: e2 } = await supabaseAdmin.from("pages").insert({ brief_id: row.id, city, slug: row.slug, html, copy: copy as never }).select("id").single();
    if (e2) throw new Error(e2.message);
    return { id: page.id };
  });
