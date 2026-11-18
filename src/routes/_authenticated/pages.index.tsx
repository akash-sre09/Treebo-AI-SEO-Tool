import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Globe, Radar, XCircle } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/AppShell";
import { briefQuery, fmtDate, pagesListQuery } from "@/lib/brief-data";
import { cityRunsQuery, trackPage } from "@/lib/probe-data";
import { setPagePublished } from "@/lib/publish.functions";
import { Switch } from "@/components/ui/switch";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { useDemoCity, useDemoStep } from "@/lib/demo";
import { useDemoTargets } from "@/components/DemoBar";
import { cn } from "@/lib/utils";
import type { City } from "@/data/seed";

export const Route = createFileRoute("/_authenticated/pages/")({
  head: () => ({
    meta: [
      { title: "Landing Pages — Treebo AI Visibility Agent" },
      { name: "description", content: "Standalone landing pages built from verified Treebo data, tracked against the latest AI answers." },
      { property: "og:title", content: "Landing Pages — Treebo AI Visibility" },
      { property: "og:description", content: "Standalone landing pages built from verified Treebo data, tracked against the latest AI answers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pages,
});

function Pages() {
  const { data = [] } = useQuery(pagesListQuery());
  const step = useDemoStep();
  const { tracked } = useDemoTargets(useDemoCity());
  const highlightId = step === 5 ? tracked?.id ?? null : null;
  return (
    <AppShell>
      <PageHeader title="Landing Pages" sub="Unpublished pages show a baseline. Once marked published, we compare the first probe after that date with the last one before it." />
      {!data.length ? <EmptyState icon={Globe} title="No pages yet" text="Open a brief and press Generate Landing Page." /> : (
        <div className="space-y-3">
          {data.map((p) => <PageRow key={p.id} page={p} highlight={p.id === highlightId} />)}
        </div>
      )}
    </AppShell>
  );
}

function PageRow({ page, highlight = false }: { page: { id: string; city: string; slug: string; brief_id: string | null; created_at: string; published_at: string | null; publish_simulated: boolean }; highlight?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { if (highlight) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [highlight]);
  const { data: brief } = useQuery({ ...briefQuery(page.brief_id ?? ""), enabled: !!page.brief_id });
  const { data: runs = [] } = useQuery(cityRunsQuery(page.city as City));
  const missed = brief?.brief.missed ?? [];
  const t = trackPage(missed, runs, page.published_at);
  const shown = t.status === "tracking" && t.after ? t.after : t.baseline;
  const save = useServerFn(setPagePublished);
  const qc = useQueryClient();
  const [date, setDate] = useState(() => (page.published_at ?? new Date().toISOString()).slice(0, 10));
  const apply = async (on: boolean, simulated = false) => {
    try {
      await save({ data: { id: page.id, publishedAt: on ? publishMoment(date) : null, simulated } });
      await qc.invalidateQueries({ queryKey: ["pages"] });
      toast.success(!on ? "Marked as not published" : simulated ? "Simulated publish (page not live)" : "Marked as published");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); }
  };
  const label = t.status === "baseline" ? `Baseline (not published) · ${t.baseline.won}/${missed.length} mention Treebo`
    : t.status === "awaiting" ? `${page.publish_simulated ? "Simulated publish" : "Published"} ${new Date(page.published_at!).toLocaleDateString("en-IN")} · awaiting a probe after publishing (baseline ${t.baseline.won}/${missed.length})`
    : `Since publishing: ${t.baseline.won} → ${t.after!.won}/${missed.length} mention Treebo (${t.change! >= 0 ? "+" : ""}${t.change})`;
  return (
    <article ref={ref} id={`page-${page.id}`} className={cn("scroll-mt-4 rounded-2xl border bg-card p-5 shadow-card", highlight && "ring-2 ring-primary")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Link to="/pages/$id" params={{ id: page.id }} className="font-mono text-sm font-semibold hover:text-primary">{page.slug}</Link>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{page.city} · {fmtDate(page.created_at)}</span>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium", t.status === "baseline" ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground")}><Radar className="h-3 w-3" />{label}</span>
          {page.published_at && page.publish_simulated && <span className="rounded-full border border-warning bg-warning/15 px-2.5 py-0.5 font-medium text-warning-foreground">Simulated — page not live</span>}
        </div>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <label className="inline-flex items-center gap-2"><Switch checked={!!page.published_at && !page.publish_simulated} onCheckedChange={(v) => apply(v)} aria-label="Mark as published" />Mark as published</label>
        <label className="inline-flex items-center gap-2"><Switch checked={!!page.published_at && page.publish_simulated} onCheckedChange={(v) => apply(v, true)} aria-label="Simulate publish (demo)" />Simulate publish (demo)</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border bg-background px-2 py-1" aria-label="Publish date" />
        {page.published_at && date !== page.published_at.slice(0, 10) && <button onClick={() => apply(true, page.publish_simulated)} className="text-primary underline">Save date</button>}
      </div>
      {missed.length ? (
        <div className="overflow-x-auto rounded-xl border border-primary/10">
          <table className="w-full min-w-[580px] text-xs">
            <thead className="text-left text-muted-foreground"><tr><th className="px-3 py-2.5 font-medium">Targeted question</th><th className="px-3 py-2.5 font-medium">Gemini{t.status === "tracking" ? " (after)" : ""}</th><th className="px-3 py-2.5 font-medium">GPT-6 Luna{t.status === "tracking" ? " (after)" : ""}</th></tr></thead>
            <tbody className="divide-y bg-card">{shown.rows.map(({ q, by }) => (
              <tr key={q}><td className="px-3 py-2.5">“{q}”</td>{by.map(({ engine, r }) => (
                <td key={engine} className="px-3 py-2.5">{!r ? <span className="text-muted-foreground">not probed</span> : r.treebo_mentioned
                  ? <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3.5 w-3.5" />mentioned{r.treebo_rank ? ` #${r.treebo_rank}` : ""}</span>
                  : <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="h-3.5 w-3.5" />missed</span>}</td>
              ))}</tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className="text-xs text-muted-foreground">This page's brief has no targeted missed questions.</p>}
    </article>
  );
}

/** Today's date means "now" (so earlier probes stay baseline); past dates mean start of that day, IST. */
function publishMoment(date: string) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return date === today ? new Date().toISOString() : new Date(`${date}T00:00:00+05:30`).toISOString();
}
