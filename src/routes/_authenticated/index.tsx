import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { findOpportunities } from "@/lib/opportunities";
import { AppShell, EmptyState, PageHeader } from "@/components/AppShell";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cities, prompts, type City } from "@/data/seed";
import { areaVisibility, latestResultsQuery, runHistoryQuery, shareOfVoice, summarize } from "@/lib/probe-data";
import { cn } from "@/lib/utils";
import { AnswerDrawer } from "@/components/AnswerDrawer";
import { WrongFactsPanel } from "@/components/WrongFactsPanel";
import type { ProbeResult } from "@/lib/probe-data";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Treebo AI Visibility Agent" },
      { name: "description", content: "How visible Treebo hotels are in AI assistant answers for Bangalore and Pune." },
      { property: "og:title", content: "Treebo AI Visibility Dashboard" },
      { property: "og:description", content: "Measure Treebo's presence in AI-generated hotel answers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [city, setCity] = useState<City>("Bangalore");
  const navigate = useNavigate();
  const { data } = useQuery(latestResultsQuery(city));
  const [wrongFactsExpanded, setWrongFactsExpanded] = useState<Partial<Record<City, boolean>>>({});
  const [answer, setAnswer] = useState<ProbeResult | null>(null);
  const wrongFactsOpen = wrongFactsExpanded[city] ?? (data?.results.some((r) => r.wrong_facts.length > 0) ?? false);
  const toggleWrongFacts = () => setWrongFactsExpanded((current) => ({ ...current, [city]: !wrongFactsOpen }));
  const s = summarize(data?.results ?? []);
  const [view, setView] = useState<"budget" | "all">("budget");
  const share = shareOfVoice(data?.results ?? [], view);
  const areas = areaVisibility(data?.results ?? [], city);
  const { data: runs = [] } = useQuery(runHistoryQuery(city));
  const trend = [...runs].filter((r) => r.total > 0).reverse().map((r) => ({
    t: new Date(r.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
    [r.engine === "gpt" ? "GPT-6 Luna" : "Gemini 3.8 Flash"]: r.mentionRate,
  }));
  const kpis = [
    { label: "Treebo mention rate", value: s.mentionRate == null ? "—" : `${s.mentionRate}%` },
    { label: "Avg rank in answers", value: s.avgRank == null ? "—" : `#${s.avgRank}` },
    { label: "Wrong facts found", value: s.n ? String(s.wrongFacts) : "—", sub: s.n ? `${s.unverified} unverified mentions` : undefined },
    { label: "Prompts tested", value: String(s.n) },
  ];
  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <PageHeader title="AI Visibility Dashboard" sub="How often AI assistants recommend Treebo, and how accurately." />
        <div className="flex items-center gap-2">
        <div className="flex rounded-lg border bg-card p-1">
          {cities.map((c) => (
            <button key={c} onClick={() => setCity(c)} className={cn("rounded-md px-4 py-1.5 text-sm transition-colors", city === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {c}
            </button>
          ))}
        </div>
        </div>
      </div>

      <Headlines city={city} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => k.label === "Wrong facts found" ? (
          <Button key={k.label} variant="ghost" onClick={toggleWrongFacts} aria-expanded={wrongFactsOpen} aria-controls="wrong-facts-content" className="block h-auto whitespace-normal rounded-2xl border bg-card p-5 text-left font-normal shadow-card">
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className="mt-2 text-3xl font-semibold">{k.value}</div>
            {"sub" in k && k.sub && <div className="mt-1 text-xs text-warning-foreground">{k.sub}</div>}
          </Button>
        ) : (
          <div key={k.label} className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className="mt-2 text-3xl font-semibold">{k.value}</div>
          </div>
        ))}
      </div>
      <WrongFactsPanel city={city} results={data?.results ?? []} open={wrongFactsOpen} onToggle={toggleWrongFacts} onAnswer={setAnswer} />
      <AnswerDrawer result={answer} city={city} onClose={() => setAnswer(null)} />

      <div className="mt-6 rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold">Treebo mention rate over time — {city}</h2>
        {trend.length ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="t" fontSize={11} />
                <YAxis unit="%" domain={[0, 100]} fontSize={11} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Gemini 3.8 Flash" stroke="var(--chart-1)" strokeWidth={2} connectNulls dot />
                <Line type="monotone" dataKey="GPT-6 Luna" stroke="var(--chart-2)" strokeWidth={2} connectNulls dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-sm text-muted-foreground">No completed runs yet.</p>}
      </div>

      <div className="mt-6">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Share of voice {view === "budget" ? "— Treebo vs budget/midscale" : "— all brands"}</h2>
            <div className="flex rounded-md border bg-card p-0.5 text-xs">
              {(["budget", "all"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={cn("rounded px-2.5 py-1", view === v ? "bg-secondary font-medium text-foreground" : "text-muted-foreground")}>{v === "budget" ? "Budget" : "All"}</button>
              ))}
            </div>
          </div>
          {s.n ? (
            <div className="h-72 rounded-2xl border bg-card p-4 shadow-card">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={share} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" unit="%" fontSize={12} />
                  <YAxis type="category" dataKey="brand" width={90} fontSize={12} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="share" radius={[0, 6, 6, 0]}>
                    {share.map((d) => <Cell key={d.brand} fill={d.brand === "Treebo" ? "var(--chart-1)" : "var(--chart-2)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState icon={BarChart3} title="No probe runs yet" text={`Run the AI Probe for ${city} (${prompts.filter((p) => p.city === city).length} prompts ready) to compare Treebo vs OYO, FabHotels and others.`} />}
        </div>
        <div className="mt-6 rounded-2xl border bg-card p-5 shadow-card">
          <h2 className="mb-3 text-sm font-semibold">Where AI recommends Treebo — {city}</h2>
          {!s.n ? <p className="text-sm text-muted-foreground">Run the AI probe to see area-by-area visibility.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b text-xs text-muted-foreground">
                  <tr><th scope="col" className="px-2 py-3 font-medium">Area</th><th scope="col" className="px-2 py-3 font-medium">Treebo mentioned</th><th scope="col" className="px-2 py-3 font-medium">Who AI recommends instead</th><th scope="col" className="px-2 py-3 font-medium">Treebo hotels</th><th scope="col" className="px-2 py-3 font-medium">Status</th></tr>
                </thead>
                <tbody className="divide-y">
                  {areas.map((row) => (
                    <tr key={row.area} onClick={() => navigate({ to: "/opportunities", search: { city } })} className="cursor-pointer transition-colors hover:bg-muted/60 focus-within:bg-muted/60">
                      <th scope="row" className="px-2 py-3 font-medium"><Button asChild variant="link" className="h-auto p-0 text-foreground"><Link to="/opportunities" search={{ city }} aria-label={`${row.area} opportunities in ${city}`}>{row.area}</Link></Button></th>
                      <td className="px-2 py-3"><div className="flex items-center gap-3"><Progress value={row.mentionRate * 100} aria-label={`Treebo mentions in ${row.area}`} className="w-20 shrink-0" /><span className="whitespace-nowrap tabular-nums">{row.mentioned} of {row.total}</span></div></td>
                      <td className="px-2 py-3 text-muted-foreground">{row.competitors.join(", ") || "—"}</td>
                      <td className="px-2 py-3 tabular-nums">{row.hotels}</td>
                      <td className="px-2 py-3">{row.status && <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", row.status === "Invisible" ? "bg-warning/15 text-warning-foreground" : "bg-success/15 text-success")}>{row.status}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

const promptMeta = (t: string) => { const p = prompts.find((x) => x.text === t); return p ? { locality: p.locality ?? null, intent: p.intent } : null; };

/** Headline stats for the selected city, from the latest run per engine. */
function Headlines({ city }: { city: City }) {
  const { data } = useQuery(latestResultsQuery(city));
  const all = data?.results ?? [];
  const gpt = all.filter((r) => r.engine === "gpt");
  const notInventory = new Set(all.flatMap((r) => (r.wrong_facts ?? []).filter((f) => f.type === "hallucinated" || f.type === "unverified_treebo" || f.type === "unknown_hotel").map((f) => f.hotel.trim().toLowerCase())));
  const missing = findOpportunities(city, all, promptMeta).length;
  const cards = [
    { big: `${gpt.filter((r) => r.treebo_mentioned).length} of ${gpt.length || prompts.filter((p) => p.city === city).length}`, text: `GPT-6 Luna answers in ${city} that mention Treebo` },
    { big: String(notInventory.size), text: `hotels AI recommended in ${city} that aren't verified Treebo inventory` },
    { big: String(missing), text: `missing landing pages found in ${city}` },
  ];
  return (
    <div className="mb-6 grid gap-4 md:grid-cols-3">
      {cards.map((c) => (
        <div key={c.text} className="app-headline-card rounded-2xl border border-primary/20 p-5 text-primary-foreground shadow-card">
          <div className="text-4xl font-bold tracking-tight">{c.big}</div>
          <div className="mt-1 text-sm opacity-90">{c.text}</div>
        </div>
      ))}
    </div>
  );
}
