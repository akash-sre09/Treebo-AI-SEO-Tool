import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prompts, type City } from "@/data/seed";
import { DEMO_STEPS, setDemoStep, useDemoCity, useDemoStep } from "@/lib/demo";
import { briefsListQuery, pagesListQuery } from "@/lib/brief-data";
import { findOpportunities } from "@/lib/opportunities";
import { latestResultsQuery } from "@/lib/probe-data";

const meta = (t: string) => { const p = prompts.find((x) => x.text === t); return p ? { locality: p.locality ?? null, intent: p.intent } : null; };

/** Saved data only — the demo never calls AI. Final step tracks the Koramangala page (Bangalore) or the city's top page. */
export function useDemoTargets(city: City) {
  const { data } = useQuery(latestResultsQuery(city));
  const { data: briefs = [] } = useQuery(briefsListQuery());
  const { data: pages = [] } = useQuery(pagesListQuery());
  const top = findOpportunities(city, data?.results ?? [], meta)[0] ?? null;
  const brief = top ? briefs.find((b) => b.city === city && b.slug === top.slug) ?? null : null;
  const page = top ? pages.find((p) => p.city === city && p.slug === top.slug) ?? null : null;
  const trackedSlug = city === "Bangalore" ? "/hotels-in-koramangala" : "/hotels-in-viman-nagar";
  const tracked = pages.find((p) => p.city === city && p.slug === trackedSlug && p.publish_simulated) ?? pages.find((p) => p.city === city && p.slug === trackedSlug) ?? null;
  return { top, brief, page, tracked };
}

export function DemoBar() {
  const step = useDemoStep();
  const city = useDemoCity();
  const navigate = useNavigate();
  const { brief, page, tracked } = useDemoTargets(city);
  useEffect(() => {
    if (step == null) return;
    if (step === 0) navigate({ to: "/" });
    else if (step === 1 || step === 2) navigate({ to: "/opportunities" });
    else if (step === 3 && brief) navigate({ to: "/briefs/$id", params: { id: brief.id } });
    else if (step === 4 && page) navigate({ to: "/pages/$id", params: { id: page.id } });
    else if (step === 5) navigate({ to: "/pages" });
  }, [step, city, brief?.id, page?.id, tracked?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (step == null) return null;
  const missing = (step === 3 && !brief) || (step === 4 && !page) || (step === 5 && !tracked);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-warning/25 bg-accent px-4 py-2.5 text-sm text-accent-foreground shadow-sm md:px-8">
      <div className="min-w-0">
        <span className="block font-semibold">Demo · {city} {step + 1}/{DEMO_STEPS.length}</span>
        <span className="block truncate text-xs opacity-85">{DEMO_STEPS[step]}{missing && " — nothing saved yet"}</span>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button size="sm" variant="ghost" disabled={step === 0} onClick={() => setDemoStep(step - 1)}><ChevronLeft className="h-4 w-4" /> Back</Button>
        <Button size="sm" disabled={step === DEMO_STEPS.length - 1} onClick={() => setDemoStep(step + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
        <Button size="sm" variant="ghost" onClick={() => setDemoStep(null)} aria-label="Exit demo"><X className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
