import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTreeboAuth } from "@/lib/treebo-auth-middleware";

const Engine = z.enum(["gemini", "gpt"]);

export const createRun = createServerFn({ method: "POST" })
  .middleware([requireTreeboAuth])
  .inputValidator((d: unknown) => z.object({ city: z.enum(["Bangalore", "Pune"]), engine: Engine }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data: recent } = await supabaseAdmin.from("probe_runs").select("created_at").eq("city", data.city).eq("engine", data.engine).gte("created_at", since).limit(1);
    if (recent?.length) {
      const wait = Math.ceil((new Date(recent[0]!.created_at).getTime() + 5 * 60_000 - Date.now()) / 60_000);
      return { runId: null, blocked: `A ${data.city} run on this engine started in the last 5 minutes. Try again in ~${wait} min.` };
    }
    const { data: row, error } = await supabaseAdmin.from("probe_runs").insert({ city: data.city, engine: data.engine }).select("id").single();
    if (error) throw new Error(error.message);
    return { runId: row.id, blocked: null };
  });

export const probeBatch = createServerFn({ method: "POST" })
  .middleware([requireTreeboAuth])
  .inputValidator((d: unknown) =>
    z.object({ runId: z.string().uuid(), city: z.enum(["Bangalore", "Pune"]), engine: Engine, prompts: z.array(z.string().max(300)).min(1).max(5) }).parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error("AI is not configured");
    const { answer, extract } = await import("@/lib/ai/engines.server");
    const { factCheck, scoreBrands } = await import("@/lib/factcheck");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: verified, error: verifiedError } = await supabaseAdmin.from("verified_hotels").select("*");
    if (verifiedError) throw new Error(verifiedError.message);
    const approved = (verified ?? []).filter((h) => h.found && h.status === "approved");
    const notFound = (verified ?? []).filter((h) => h.city === data.city && !h.found).map((h) => h.lookup_name);
    const results = await Promise.all(
      data.prompts.map(async (prompt) => {
        try {
          const text = await answer(data.engine, key, prompt);
          const ex = await extract(data.engine, key, text);
          const s = scoreBrands(ex.brands.length ? ex.brands : ex.hotels.map((h) => h.brand));
          return { row: {
            run_id: data.runId, prompt, engine: data.engine, answer_text: text,
            treebo_mentioned: s.treeboMentioned, treebo_rank: s.treeboRank, competitors_mentioned: s.competitors,
            brands: s.ordered, wrong_facts: factCheck(ex, data.city, approved as import("@/data/seed").TreeboHotel[], notFound) as never, sources: ex.sources, extraction: ex as never,
          } };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("probe failed", prompt, msg);
          return { error: msg, prompt, row: null };
        }
      }),
    );
    const ok = results.flatMap((r) => (r.row ? [r.row] : []));
    if (ok.length) {
      const { error } = await supabaseAdmin.from("probe_results").insert(ok);
      if (error) throw new Error(error.message);
    }
    return { saved: ok.length, errors: results.flatMap((r) => ("error" in r ? [{ error: r.error, prompt: r.prompt }] : [])) };
  });
