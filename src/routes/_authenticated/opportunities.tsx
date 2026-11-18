import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { generateBrief } from "@/lib/brief.functions";
import { useDemoCity, useDemoStep } from "@/lib/demo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FileText, Loader2, Lightbulb, MapPin } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/AppShell";
import { AnswerDrawer } from "@/components/AnswerDrawer";
import { Button } from "@/components/ui/button";
import { cities, prompts, type City } from "@/data/seed";
import { findOpportunities } from "@/lib/opportunities";
import { latestResultsQuery, type ProbeResult } from "@/lib/probe-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/opportunities")({
  validateSearch: (search: Record<string, unknown>): { city?: City } => {
    const city = search["city"];
    return city === "Bangalore" || city === "Pune" ? { city } : {};
  },
  head: () => ({
    meta: [
      { title: "Opportunities — Treebo AI Visibility Agent" },
      { name: "description", content: "Landing pages competitors have where Treebo has hotels but no page." },
      { property: "og:title", content: "Opportunities — Treebo AI Visibility" },
      { property: "og:description", content: "Landing pages competitors have where Treebo has hotels but no page." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Opportunities,
});

function Opportunities() {
  const { city: requestedCity } = Route.useSearch();
  const [city, setCity] = useState<City>(requestedCity ?? "Bangalore");
  useEffect(() => { if (requestedCity) setCity(requestedCity); }, [requestedCity]);
  const [open, setOpen] = useState<ProbeResult | null>(null);
  const { data } = useQuery(latestResultsQuery(city));
  const results = data?.results ?? [];
  const opps = findOpportunities(city, results, (t) => { const p = prompts.find((x) => x.text === t); return p ? { locality: p.locality ?? null, intent: p.intent } : null; });
  const demo = useDemoStep();
  const demoCity = useDemoCity();
  useEffect(() => { if (demo != null) setCity(demoCity); }, [demo, demoCity]);
  useEffect(() => {
    if (demo === 2) document.getElementById("demo-missed")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [demo]);
  const gen = useServerFn(generateBrief);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const onGenerate = async (slug: string, missed: string[]) => {
    setBusy(slug);
    try {
      const r = await gen({ data: { city, slug, missed: [...new Set(missed)] } });
      await qc.invalidateQueries({ queryKey: ["briefs"] });
      navigate({ to: "/briefs/$id", params: { id: r.id } });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not generate brief"); }
    finally { setBusy(null); }
  };

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <PageHeader title="Opportunities" sub="Pages competitors have where Treebo has hotels but no page — ranked by score." />
        <div className="flex rounded-lg border bg-card p-1">
          {cities.map((c) => (
            <button key={c} onClick={() => setCity(c)} className={cn("rounded-md px-4 py-1.5 text-sm", city === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{c}</button>
          ))}
        </div>
      </div>
      {!opps.length ? (
        <EmptyState icon={Lightbulb} title="No missing pages found" text={`No competitor page in ${city} matches an area where Treebo has hotels.`} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {opps.map((o, i) => (
            <article key={o.slug} className={cn("flex min-w-0 flex-col rounded-2xl border bg-card p-5 shadow-card", demo != null && i === 0 && "ring-2 ring-primary")}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">#{i + 1} · Suggested page</div>
                  <div className="truncate font-mono text-sm font-semibold">{o.slug}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{o.area}, {o.city}</div>
                </div>
                <div className="shrink-0 rounded-xl border border-warning/25 bg-accent px-3 py-2 text-center text-accent-foreground shadow-sm">
                  <div className="text-2xl font-semibold leading-none">{o.score}</div>
                  <div className="text-[10px] uppercase tracking-wide">score</div>
                </div>
              </div>
              <div className="mb-4 grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2 text-center text-xs">
                <Part label={`${o.hotels.length} Treebo hotels × 2`} value={o.breakdown.hotels} />
                <Part label={`${new Set(o.competitors.map((c) => c.brand)).size} competitors × 2`} value={o.breakdown.competitors} />
                <Part label={`${o.missed.length} missed answers × 3`} value={o.breakdown.missed} />
              </div>
              <div className="mb-3 text-xs">
                <div className="mb-1 font-medium">Treebo hotels here</div>
                <ul className="space-y-0.5 text-muted-foreground">{o.hotels.map((h) => <li key={h.id}>{h.name}{h.pricePerNight != null && ` · ₹${h.pricePerNight.toLocaleString("en-IN")}`}</li>)}</ul>
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-1 text-xs">
                <span className="mr-1 font-medium">Competitors:</span>
                {o.competitors.map((c) => (
                  <span key={c.brand} className="rounded-full bg-muted px-2 py-0.5">{c.brand}{c.placeholder && <span className="ml-1 text-muted-foreground">(placeholder)</span>}</span>
                ))}
              </div>
              <div id={i === 0 ? "demo-missed" : undefined} className={cn("mb-4 rounded-lg text-xs", demo === 2 && i === 0 && "bg-accent/60 p-2 ring-2 ring-primary")}>
                <div className="mb-1 font-medium">Matched missed answers <span className="font-normal text-muted-foreground">— {o.area} · {o.intent ? `${o.intent} intent only` : "all intents"}</span></div>
                {o.missed.length ? (
                  <ul className="space-y-1">
                    {o.missed.map((m) => (
                      <li key={m.id}><button onClick={() => setOpen(results.find((r) => r.id === m.id) ?? null)} className="text-left text-primary hover:underline">“{m.prompt}”</button> <span className="text-muted-foreground">· {prompts.find((p) => p.text === m.prompt)?.intent} · {results.find((r) => r.id === m.id)?.engine === "gpt" ? "GPT-6 Luna" : "Gemini"}</span></li>
                    ))}
                  </ul>
                ) : <span className="text-muted-foreground">No matching missed questions in the latest runs.</span>}
              </div>
              <Button className="mt-auto" disabled={busy !== null} onClick={() => onGenerate(o.slug, o.missed.map((m) => m.prompt))}>{busy === o.slug ? <><Loader2 className="h-4 w-4 animate-spin" /> Writing brief…</> : <><FileText className="h-4 w-4" /> Generate Brief</>}</Button>
            </article>
          ))}
        </div>
      )}
      <AnswerDrawer result={open} city={city} onClose={() => setOpen(null)} />
    </AppShell>
  );
}

function Part({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/60 p-2">
      <div className="text-base font-semibold">+{value}</div>
      <div className="text-[10px] leading-tight text-muted-foreground">{label}</div>
    </div>
  );
}
