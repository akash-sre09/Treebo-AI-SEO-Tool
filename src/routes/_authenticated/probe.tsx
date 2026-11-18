import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Loader2, Minus, Play, Radar, X } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/AppShell";
import { WrongFactBadges } from "@/components/WrongFactBadges";
import { Button } from "@/components/ui/button";
import { AnswerDrawer } from "@/components/AnswerDrawer";
import { UnverifiedHotels } from "@/components/UnverifiedHotels";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cities, prompts, type City } from "@/data/seed";
import { createRun, probeBatch } from "@/lib/probe.functions";
import { NOISE_PTS, isNoise, compareRuns, latestResultsQuery, runHistoryQuery, type ProbeResult, type RunSummary } from "@/lib/probe-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/probe")({
  head: () => ({
    meta: [
      { title: "AI Probe — Treebo AI Visibility Agent" },
      { name: "description", content: "Ask AI assistants real traveller questions and check whether Treebo shows up." },
      { property: "og:title", content: "AI Probe — Treebo AI Visibility" },
      { property: "og:description", content: "Run traveller questions through two AI engines and fact-check the answers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Probe,
});

const ENGINES = [
  { key: "gemini", label: "Gemini 3.8 Flash" },
  { key: "gpt", label: "GPT-6 Luna" },
] as const;
type EngineKey = (typeof ENGINES)[number]["key"];
type Log = { t: string; msg: string; kind: "info" | "ok" | "err" };

function Probe() {
  const [city, setCity] = useState<City>("Bangalore");
  const [engines, setEngines] = useState<EngineKey[]>(["gemini"]);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<Log[]>([]);
  const [open, setOpen] = useState<ProbeResult | null>(null);
  const [confirm, setConfirm] = useState(false);
  const qc = useQueryClient();
  const { data } = useQuery(latestResultsQuery(city));
  const runFn = useServerFn(createRun);
  const batchFn = useServerFn(probeBatch);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { logRef.current?.scrollTo({ top: 1e6 }); }, [log]);

  const add = (msg: string, kind: Log["kind"] = "info") =>
    setLog((l) => [...l, { t: new Date().toLocaleTimeString(), msg, kind }]);

  async function run() {
    setRunning(true); setLog([]);
    const qs = prompts.filter((p) => p.city === city).map((p) => p.text);
    try {
      for (const engine of engines) {
        const name = ENGINES.find((e) => e.key === engine)!.label;
        add(`Starting ${name} run for ${city} — ${qs.length} questions`);
        const { runId, blocked } = await runFn({ data: { city, engine } });
        if (!runId) { add(blocked ?? "Run blocked", "err"); continue; }
        for (let i = 0; i < qs.length; i += 5) {
          const batch = qs.slice(i, i + 5);
          add(`Asking batch ${i / 5 + 1}: ${batch.length} questions in parallel…`);
          const r = await batchFn({ data: { runId, city, engine, prompts: batch } });
          add(`Batch ${i / 5 + 1}: ${r.saved} answers extracted & fact-checked`, "ok");
          r.errors.forEach((e) => add(`Failed: "${e.prompt}" — ${e.error}`, "err"));
          await qc.invalidateQueries({ queryKey: ["probe", city] }); qc.invalidateQueries({ queryKey: ["runs", city] }); qc.invalidateQueries({ queryKey: ["cityRuns", city] });
          if (r.saved === 0 && r.errors.length) throw new Error("Stopping: every question in this batch failed.");
        }
        add(`${name} run complete`, "ok");
      }
    } catch (e) {
      add(e instanceof Error ? e.message : String(e), "err");
    } finally {
      setRunning(false);
      qc.invalidateQueries({ queryKey: ["probe", city] }); qc.invalidateQueries({ queryKey: ["runs", city] }); qc.invalidateQueries({ queryKey: ["cityRuns", city] });
    }
  }

  const results = data?.results ?? [];
  return (
    <AppShell>
      <PageHeader title="AI Probe" sub="Ask AI assistants real traveller questions and check whether Treebo shows up — and whether the facts are right." />
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 shadow-card">
        <div className="flex rounded-lg border p-1">
          {cities.map((c) => (
            <button key={c} disabled={running} onClick={() => setCity(c)} className={cn("rounded-md px-3 py-1.5 text-sm", city === c ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{c}</button>
          ))}
        </div>
        <div className="flex gap-2">
          {ENGINES.map((e) => {
            const on = engines.includes(e.key);
            return (
              <button key={e.key} disabled={running} onClick={() => setEngines(on ? engines.filter((x) => x !== e.key) : [...engines, e.key])}
                className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors", on ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground hover:bg-secondary")}>
                {on && <Check className="h-3.5 w-3.5" />}{e.label}
              </button>
            );
          })}
        </div>
        <Button className="ml-auto" disabled={running || !engines.length} onClick={() => setConfirm(true)}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run probe
        </Button>
      </div>

      {log.length > 0 && (
        <div ref={logRef} className="app-log-panel mb-6 max-h-56 overflow-y-auto rounded-2xl p-4 font-mono text-xs leading-relaxed text-sidebar-foreground">
          {log.map((l, i) => (
            <div key={i} className={cn(l.kind === "ok" && "text-success", l.kind === "err" && "text-destructive")}>
              <span className="opacity-50">{l.t}</span> › {l.msg}
            </div>
          ))}
          {running && <div className="animate-pulse opacity-70">› thinking…</div>}
        </div>
      )}

      {results.length === 0 ? (
        <EmptyState icon={Radar} title={`No results for ${city} yet`} text="Pick engines and press Run probe." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr><th className="p-3">Question</th><th className="p-3">Engine</th><th className="p-3">Treebo</th><th className="p-3">Rank</th><th className="p-3">Competitors</th><th className="p-3">Wrong facts</th></tr>
            </thead>
            <tbody className="divide-y">
              {results.map((r) => (
                <tr key={r.id} onClick={() => setOpen(r)} className="cursor-pointer hover:bg-muted/50">
                  <td className="max-w-xs p-3">{r.prompt}</td>
                  <td className="p-3 text-xs text-muted-foreground">{ENGINES.find((e) => e.key === r.engine)?.label}</td>
                  <td className="p-3">{r.treebo_mentioned ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-destructive" />}</td>
                  <td className="p-3">{r.treebo_rank ?? "—"}</td>
                  <td className="p-3"><div className="flex flex-wrap gap-1">{r.competitors_mentioned.slice(0, 4).map((c) => <span key={c} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{c}</span>)}</div></td>
                  <td className="p-3"><WrongFactBadges facts={r.wrong_facts} city={city} question={r.prompt} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UnverifiedHotels city={city} results={data?.unreviewedResults ?? results} />
      <CompareRuns city={city} />
      <RunHistory city={city} />
      <AnswerDrawer result={open} city={city} onClose={() => setOpen(null)} />

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run the AI probe?</AlertDialogTitle>
            <AlertDialogDescription>
              This asks {prompts.filter((p) => p.city === city).length} {city} questions on {engines.map((e) => ENGINES.find((x) => x.key === e)!.label).join(" and ")} ({prompts.filter((p) => p.city === city).length * engines.length} AI answers, uses AI credits). Each city + engine can run once every 5 minutes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={run}>Run probe</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function RunHistory({ city }: { city: City }) {
  const { data = [] } = useQuery(runHistoryQuery(city));
  return (
    <section className="mt-6 rounded-2xl border bg-card p-5 shadow-card">
      <h2 className="mb-3 text-sm font-semibold">Run history · {city}</h2>
      {!data.length ? <p className="text-sm text-muted-foreground">No runs yet.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2.5">Started</th><th className="px-3 py-2.5">Engine</th><th className="px-3 py-2.5">Answers</th><th className="px-3 py-2.5">Treebo mentioned</th></tr></thead>
            <tbody className="divide-y">{data.map((r) => (
              <tr key={r.id}><td className="px-3 py-2.5">{new Date(r.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td>
              <td className="px-3 py-2.5">{r.engine === "gpt" ? "GPT-6 Luna" : "Gemini 3.8 Flash"}</td><td className="px-3 py-2.5">{r.total}</td><td className="px-3 py-2.5">{r.mentioned}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Delta({ now, prev, unit = "", lowerIsBetter = false, noise = 0 }: { now: number | null; prev: number | null; unit?: string; lowerIsBetter?: boolean; noise?: number }) {
  if (now == null || prev == null) return <span className="text-xs text-muted-foreground">no previous</span>;
  const d = +(now - prev).toFixed(1);
  if (d === 0) return <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><Minus className="h-3 w-3" />no change</span>;
  const good = lowerIsBetter ? d < 0 : d > 0;
  const quiet = noise > 0 && isNoise(d, noise);
  return <span title={quiet ? "Within normal run-to-run variation" : undefined} className={cn("inline-flex items-center gap-0.5 text-xs font-medium", quiet ? "text-muted-foreground opacity-70" : good ? "text-success" : "text-destructive")}>{d > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}{d > 0 ? "+" : ""}{d}{unit}</span>;
}

function CompareRuns({ city }: { city: City }) {
  const { data = [] } = useQuery(runHistoryQuery(city));
  const rows = compareRuns(data);
  const t = (r: RunSummary) => new Date(r.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <section id="compare" className="mt-6 rounded-2xl border bg-card p-5 shadow-card">
      <h2 className="mb-3 text-sm font-semibold">Latest vs previous run · {city}</h2>
      <p className="mb-3 text-xs text-muted-foreground">AI answers vary run to run; changes under ±10 points are normal.</p>
      {!rows.length ? <p className="text-sm text-muted-foreground">No completed runs yet.</p> : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map(({ engine, latest, previous }) => (
            <div key={engine} className="rounded-xl border p-4">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <div className="font-medium">{engine === "gpt" ? "GPT-6 Luna" : "Gemini 3.8 Flash"}</div>
                <div className="text-xs text-muted-foreground">{t(latest)}{previous ? ` vs ${t(previous)}` : ""}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><div className="text-xs text-muted-foreground">Mention rate</div><div className="text-lg font-semibold">{latest.mentionRate ?? "—"}%</div><Delta now={latest.mentionRate} prev={previous?.mentionRate ?? null} unit=" pts" noise={NOISE_PTS} /></div>
                <div><div className="text-xs text-muted-foreground">Avg rank</div><div className="text-lg font-semibold">{latest.avgRank != null ? `#${latest.avgRank}` : "—"}</div><Delta now={latest.avgRank} prev={previous?.avgRank ?? null} lowerIsBetter /></div>
                <div><div className="text-xs text-muted-foreground">Wrong facts</div><div className="text-lg font-semibold">{latest.wrongFacts}</div><Delta now={latest.wrongFacts} prev={previous?.wrongFacts ?? null} lowerIsBetter /></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
