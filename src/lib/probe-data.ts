import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { prompts, treeboHotels, type City } from "@/data/seed";
import { brandGroup, isRed, scoreBrands, type WrongFact } from "@/lib/factcheck";
import { checkWithVerified, reviewLegacyFacts, type VerifiedHotel } from "./verified-hotels";
import type { Extraction } from "./factcheck";

/** Area a probe question targets, from the seed question list. */
export const promptArea = (text: string) => prompts.find((p) => p.text === text)?.locality ?? null;

export interface ProbeResult {
  id: string; run_id: string; prompt: string; engine: string; answer_text: string;
  treebo_mentioned: boolean; treebo_rank: number | null; competitors_mentioned: string[];
  brands: string[]; wrong_facts: WrongFact[]; sources: string[];
  extraction?: Extraction | null;
}

/** Latest run per engine for the city, with its results. */
export const latestResultsQuery = (city: City) =>
  queryOptions({
    queryKey: ["probe", city],
    queryFn: async () => {
      const { data: runs, error } = await supabase.from("probe_runs").select("id, engine, created_at").eq("city", city).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      const latest = new Map<string, { id: string; created_at: string }>();
      for (const r of runs ?? []) if (!latest.has(r.engine)) latest.set(r.engine, r);
      const ids = [...latest.values()].map((r) => r.id);
      if (!ids.length) return { results: [] as ProbeResult[], unreviewedResults: [] as ProbeResult[], lastRun: null as string | null };
      const { data, error: e2 } = await supabase.from("probe_results").select("*").in("run_id", ids).order("created_at");
      if (e2) throw e2;
      const { data: verified, error: verificationError } = await supabase.from("verified_hotels").select("*").eq("city", city);
      if (verificationError) throw verificationError;
      const hotels = (verified ?? []) as VerifiedHotel[];
      const raw = (data ?? []) as unknown as ProbeResult[];
      const results = raw.map((r) => ({ ...r, wrong_facts: r.extraction ? checkWithVerified(r.extraction, city, hotels) : reviewLegacyFacts(r.wrong_facts, city, hotels) }));
      return { results, unreviewedResults: raw, lastRun: [...latest.values()][0]?.created_at ?? null };
    },
  });

export function shareOfVoice(results: ProbeResult[], view: "budget" | "all") {
  const sov = new Map<string, number>();
  for (const r of results) for (const b of r.brands ?? []) {
    if (view === "budget" && b !== "Treebo" && brandGroup(b) !== "budget") continue;
    sov.set(b, (sov.get(b) ?? 0) + 1);
  }
  const total = [...sov.values()].reduce((a, b) => a + b, 0);
  const sorted = [...sov.entries()].filter(([b]) => b !== "Treebo").sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5);
  const restLabel = view === "budget" ? "Other budget" : "Others";
  const rest = sorted.slice(5).reduce((a, [, c]) => a + c, 0);
  return [["Treebo", sov.get("Treebo") ?? 0] as const, ...top, ...(rest ? [[restLabel, rest] as const] : [])]
    .map(([brand, c]) => ({ brand, share: total ? Math.round((c / total) * 100) : 0 }));
}

export interface AreaVisibility {
  area: string;
  mentioned: number;
  total: number;
  mentionRate: number;
  competitors: string[];
  hotels: number;
  status: "Invisible" | "Strong" | null;
}

/** Area outcomes from the latest results per engine supplied by latestResultsQuery. */
export function areaVisibility(results: Pick<ProbeResult, "prompt" | "treebo_mentioned" | "competitors_mentioned">[], city: City): AreaVisibility[] {
  const cityPrompts = prompts.filter((p) => p.city === city);
  const areas = [...new Set(cityPrompts.flatMap((p) => p.locality ? [p.locality] : []))];
  return areas.map((area): AreaVisibility => {
    const questions = new Set(cityPrompts.filter((p) => p.locality === area).map((p) => p.text));
    const answers = results.filter((r) => questions.has(r.prompt));
    const mentioned = answers.filter((r) => r.treebo_mentioned).length;
    const total = answers.length;
    const mentionRate = total ? mentioned / total : 0;
    const hotels = treeboHotels.filter((h) => h.city === city && h.locality === area).length;
    const counts = new Map<string, { brand: string; count: number }>();
    for (const answer of answers) for (const brand of scoreBrands(answer.competitors_mentioned ?? []).competitors) {
      const key = brand.toLowerCase();
      const previous = counts.get(key);
      counts.set(key, { brand: previous?.brand ?? brand, count: (previous?.count ?? 0) + 1 });
    }
    const competitors = [...counts.values()].sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand)).slice(0, 2).map((b) => b.brand);
    return { area, mentioned, total, mentionRate, competitors, hotels, status: mentioned === 0 && hotels > 0 ? "Invisible" : total > 0 && mentionRate >= 0.5 ? "Strong" : null };
  }).sort((a, b) => a.mentionRate - b.mentionRate || b.hotels - a.hotels || a.area.localeCompare(b.area));
}

export function summarize(results: ProbeResult[]) {
  const n = results.length;
  const mentioned = results.filter((r) => r.treebo_mentioned);
  const ranks = mentioned.map((r) => r.treebo_rank).filter((x): x is number => x != null);
  const facts = results.flatMap((r) => r.wrong_facts ?? []);
  return {
    n,
    mentionRate: n ? Math.round((mentioned.length / n) * 100) : null,
    avgRank: ranks.length ? +(ranks.reduce((a, b) => a + b, 0) / ranks.length).toFixed(1) : null,
    wrongFacts: facts.filter(isRed).length,
    unverified: facts.filter((f) => !isRed(f)).length,
  };
}

export const runHistoryQuery = (city: City) =>
  queryOptions({
    queryKey: ["runs", city],
    queryFn: async (): Promise<RunSummary[]> => {
      const { data: runs, error } = await supabase.from("probe_runs").select("id, engine, created_at").eq("city", city).order("created_at", { ascending: false }).limit(60);
      if (error) throw error;
      const ids = (runs ?? []).map((r) => r.id);
      const { data: res } = ids.length ? await supabase.from("probe_results").select("run_id, treebo_mentioned, treebo_rank, wrong_facts, extraction").in("run_id", ids) : { data: [] };
      const { data: verified, error: verificationError } = await supabase.from("verified_hotels").select("*").eq("city", city);
      if (verificationError) throw verificationError;
      const hotels = (verified ?? []) as VerifiedHotel[];
      return (runs ?? []).map((r) => {
        const rs = ((res ?? []) as unknown as ProbeResult[]).filter((x) => x.run_id === r.id).map((x) => ({ ...x, wrong_facts: x.extraction ? checkWithVerified(x.extraction, city, hotels) : reviewLegacyFacts(x.wrong_facts, city, hotels) }));
        const s = summarize(rs);
        return { ...r, total: rs.length, mentioned: rs.filter((x) => x.treebo_mentioned).length, mentionRate: s.mentionRate, avgRank: s.avgRank, wrongFacts: s.wrongFacts, unverified: s.unverified };
      });
    },
  });

export interface RunSummary { id: string; engine: string; created_at: string; total: number; mentioned: number; mentionRate: number | null; avgRank: number | null; wrongFacts: number; unverified: number }

/** Latest vs previous completed run per engine. Pure. */
export function compareRuns(runs: RunSummary[]) {
  const out: { engine: string; latest: RunSummary; previous: RunSummary | null }[] = [];
  for (const engine of ["gemini", "gpt"]) {
    const rs = runs.filter((r) => r.engine === engine && r.total > 0);
    if (rs[0]) out.push({ engine, latest: rs[0], previous: rs[1] ?? null });
  }
  return out;
}

export interface RunWithAnswers { id: string; engine: string; created_at: string; answers: { prompt: string; treebo_mentioned: boolean; treebo_rank: number | null }[] }

/** All runs for a city with per-question mention outcomes (newest first). */
export const cityRunsQuery = (city: City) =>
  queryOptions({
    queryKey: ["cityRuns", city],
    queryFn: async (): Promise<RunWithAnswers[]> => {
      const { data: runs, error } = await supabase.from("probe_runs").select("id, engine, created_at").eq("city", city).order("created_at", { ascending: false }).limit(60);
      if (error) throw error;
      const ids = (runs ?? []).map((r) => r.id);
      const { data: res } = ids.length ? await supabase.from("probe_results").select("run_id, prompt, treebo_mentioned, treebo_rank").in("run_id", ids) : { data: [] };
      return (runs ?? []).map((r) => ({ ...r, answers: (res ?? []).filter((x) => x.run_id === r.id) }));
    },
  });

/**
 * Tracking for one page's targeted questions. Baseline = latest run per engine before publishing
 * (or the latest run overall when unpublished). After = latest run per engine after publishing. Pure.
 */
export function trackPage(questions: string[], runs: RunWithAnswers[], publishedAt: string | null) {
  const pub = publishedAt ? new Date(publishedAt).getTime() : null;
  const sorted = [...runs].filter((r) => r.answers.length).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const pick = (engine: string, after: boolean) => sorted.find((r) => r.engine === engine && (pub == null ? !after : after ? +new Date(r.created_at) > pub : +new Date(r.created_at) <= pub)) ?? null;
  const engines = ["gemini", "gpt"] as const;
  const side = (after: boolean) => {
    const byEngine = engines.map((e) => ({ engine: e, run: pick(e, after) }));
    const rows = questions.map((q) => ({ q, by: byEngine.map(({ engine, run }) => ({ engine, r: run?.answers.find((a) => a.prompt === q) ?? null })) }));
    const hasData = byEngine.some((b) => b.run);
    return { rows, hasData, won: rows.filter((r) => r.by.some((b) => b.r?.treebo_mentioned)).length };
  };
  const baseline = side(false);
  const after = pub == null ? null : side(true);
  return { status: pub == null ? "baseline" as const : after?.hasData ? "tracking" as const : "awaiting" as const, baseline, after, change: after?.hasData ? after.won - baseline.won : null };
}

/** Run-to-run noise threshold (points) for mention rate. */
export const NOISE_PTS = 10;
export const isNoise = (delta: number, threshold = NOISE_PTS) => Math.abs(delta) < threshold;
