import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTreeboAuth } from "@/lib/treebo-auth-middleware";

export const generateBrief = createServerFn({ method: "POST" })
  .middleware([requireTreeboAuth])
  .inputValidator((d: unknown) => z.object({ city: z.enum(["Bangalore", "Pune"]), slug: z.string().max(200), missed: z.array(z.string().max(300)).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error("AI is not configured");
    const { competitorPages, treeboHotels, treeboExistingPages, prompts } = await import("@/data/seed");
    const { slugIntent } = await import("@/lib/opportunities");
    const { checkBrief } = await import("@/lib/briefcheck");
    const comp = competitorPages.find((c) => c.city === data.city && c.slug === data.slug);
    if (!comp) throw new Error("Unknown opportunity");
    const hotels = treeboHotels.filter((h) => h.city === data.city && h.locality === comp.locality);
    const missed = data.missed.filter((q) => prompts.some((p) => p.text === q && p.city === data.city));
    const intent = slugIntent(data.slug);
    const facts = hotels.map((h) => `- ${h.name} | area: ${h.locality} | price: ${h.pricePerNight != null ? `₹${h.pricePerNight} per night` : "not listed — do not mention price"} | rating: ${h.rating}/5 (${h.reviewCount} reviews)${h.coupleFriendly ? " | couple-friendly" : ""}`).join("\n");
    const faqQs = missed.length ? missed : [];
    const prompt = `Page slug: ${data.slug}\nCity: ${data.city}\nArea: ${comp.locality}\nIntent: ${intent ?? "general area page"}\n\nVERIFIED Treebo hotels in this area (the only facts you may use):\n${facts}\n\nInternal links may ONLY point to these existing Treebo slugs: ${treeboExistingPages[data.city].join(", ")}\n\nWrite exactly 6 FAQs.${faqQs.length ? ` The first ${Math.min(6, faqQs.length)} FAQ questions must be these exact traveller questions (AI assistants failed to mention Treebo for them), answered with the verified hotels:\n${faqQs.slice(0, 6).map((q, i) => `${i + 1}. ${q}`).join("\n")}` : ""}\nSchema types must include Hotel and FAQPage.`;
    const { writeBrief } = await import("@/lib/ai/engines.server");
    const { repairLengths } = await import("@/lib/brief-repair.server");
    const { brief: content, fixed: autoFixed } = await repairLengths(key, await writeBrief(key, prompt));
    const checks = checkBrief(content, data.city, missed);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("briefs").insert({ city: data.city, slug: data.slug, brief: { ...content, area: comp.locality, intent, missed, checks, autoFixed, model: "google/gemini-3.8-flash" } as never }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

/** Repair an existing brief's over-length meta fields in place, then re-run checks. */
export const repairBrief = createServerFn({ method: "POST" })
  .middleware([requireTreeboAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error("AI is not configured");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("briefs").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const { checkBrief } = await import("@/lib/briefcheck");
    const { repairLengths } = await import("@/lib/brief-repair.server");
    const b = row.brief as never as Parameters<typeof checkBrief>[0] & { missed: string[]; autoFixed?: string[] };
    const { brief, fixed } = await repairLengths(key, b);
    const checks = checkBrief(brief, row.city as "Bangalore" | "Pune", b.missed ?? []);
    const autoFixed = [...new Set([...(b.autoFixed ?? []), ...fixed])];
    await supabaseAdmin.from("briefs").update({ brief: { ...brief, checks, autoFixed } as never }).eq("id", data.id);
    return { fixed };
  });
