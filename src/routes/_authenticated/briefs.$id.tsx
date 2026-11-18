import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Wand2 } from "lucide-react";
import { generatePage } from "@/lib/page.functions";
import { checkBrief } from "@/lib/briefcheck";
import { repairBrief } from "@/lib/brief.functions";
import { CheckCircle2, Globe, Target, XCircle } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { briefQuery, fmtDate } from "@/lib/brief-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/briefs/$id")({
  head: () => ({
    meta: [
      { title: "Content Brief — Treebo AI Visibility Agent" },
      { name: "description", content: "A landing-page brief with SEO snippet, outline, FAQs and fact checks." },
      { property: "og:title", content: "Content Brief — Treebo AI Visibility" },
      { property: "og:description", content: "A landing-page brief with SEO snippet, outline, FAQs and fact checks." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BriefPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border bg-card p-5 shadow-card"><h2 className="mb-4 border-l-2 border-chart-2 pl-3 text-sm font-semibold text-primary">{title}</h2>{children}</section>;
}

function fixedTag(b: { autoFixed?: string[] }, f: string) {
  return b.autoFixed?.includes(f) ? <span className="ml-2 inline-block rounded-full bg-accent px-2 py-0.5 align-middle text-[10px] font-medium text-accent-foreground">auto-fixed</span> : null;
}

function BriefPage() {
  const { id } = Route.useParams();
  const { data: row, isLoading } = useQuery(briefQuery(id));
  const [busy, setBusy] = useState<"page" | "fix" | null>(null);
  const gen = useServerFn(generatePage);
  const fix = useServerFn(repairBrief);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const run = async (kind: "page" | "fix") => {
    setBusy(kind);
    try {
      if (kind === "page") {
        const r = await gen({ data: { briefId: id } });
        await qc.invalidateQueries({ queryKey: ["pages"] });
        navigate({ to: "/pages/$id", params: { id: r.id } });
      } else { await fix({ data: { id } }); await qc.invalidateQueries({ queryKey: ["brief", id] }); }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); } finally { setBusy(null); }
  };
  if (isLoading) return <AppShell><p className="text-sm text-muted-foreground">Loading brief…</p></AppShell>;
  if (!row) return <AppShell><EmptyState icon={Target} title="Brief not found" text="It may have been removed." /></AppShell>;
  // Re-run checks live so rule fixes apply to saved briefs too.
  const b = { ...row.brief, checks: checkBrief(row.brief, row.city as "Bangalore" | "Pune", row.brief.missed ?? []) };
  const allPass = b.checks.every((c) => c.pass);
  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <PageHeader title={b.h1} sub={`${row.slug} · ${row.city} · generated ${fmtDate(row.created_at)}`} />
        <div className="flex gap-2">
          {b.checks.some((c) => (c.id === "title" || c.id === "desc") && !c.pass) && (
            <Button variant="outline" disabled={busy != null} onClick={() => run("fix")}>{busy === "fix" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Auto-fix lengths</Button>
          )}
          <Button disabled={busy != null} onClick={() => run("page")}>{busy === "page" ? <><Loader2 className="h-4 w-4 animate-spin" /> Building page…</> : <><Globe className="h-4 w-4" /> Generate Landing Page</>}</Button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Google search preview">
            <div className="max-w-xl font-sans">
              <div className="text-xs text-muted-foreground">treebo.com › {row.slug.replace(/^\//, "")}</div>
              <div className="text-lg leading-snug text-primary">{b.metaTitle}{fixedTag(b, "metaTitle")}</div>
              <div className="text-sm text-muted-foreground">{b.metaDescription}{fixedTag(b, "metaDescription")}</div>
            </div>
          </Section>
          <Section title="Outline">
            <div className="mb-2 text-sm"><span className="font-mono text-xs text-muted-foreground">H1 </span>{b.h1}</div>
            <ol className="ml-4 list-decimal space-y-1 text-sm">{b.h2Outline.map((h) => <li key={h}>{h}</li>)}</ol>
            <p className="mt-3 text-sm text-muted-foreground"><span className="font-medium text-foreground">Intro angle: </span>{b.introAngle}</p>
          </Section>
          <Section title="FAQs">
            <dl className="space-y-3 text-sm">{b.faqs.map((f) => <div key={f.question}><dt className="font-medium">{f.question}</dt><dd className="text-muted-foreground">{f.answer}</dd></div>)}</dl>
          </Section>
          <Section title="Missed AI answers this brief targets">
            {b.missed.length ? <ul className="space-y-1 text-sm">{b.missed.map((q) => <li key={q}>“{q}” <span className={cn("ml-1 rounded-full px-2 py-0.5 text-[10px]", b.faqs.some((f) => f.question.trim() === q.trim()) ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>{b.faqs.some((f) => f.question.trim() === q.trim()) ? "answered in FAQ" : "not in FAQ"}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">No missed answers matched this page.</p>}
          </Section>
        </div>
        <div className="space-y-4">
          <Section title={allPass ? "Checks — all passed" : "Checks — some failed"}>
            <ul className="space-y-2 text-sm">{b.checks.map((c) => (
              <li key={c.id} className="flex gap-2">
                {c.pass ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                <div><div className={cn("font-medium", !c.pass && "text-destructive")}>{c.label}</div><div className="text-xs text-muted-foreground">{c.detail}</div></div>
              </li>
            ))}</ul>
          </Section>
          <Section title="Target keywords"><div className="flex flex-wrap gap-1">{b.targetKeywords.map((k) => <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-xs">{k}</span>)}</div></Section>
          <Section title="Internal links"><ul className="space-y-1 text-sm">{b.internalLinks.map((l) => <li key={l.slug + l.anchor}>{l.anchor} → <span className="font-mono text-xs">{l.slug}</span></li>)}</ul></Section>
          <Section title="Schema"><div className="flex gap-1">{b.schemaTypes.map((s) => <span key={s} className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{s}</span>)}</div></Section>
        </div>
      </div>
    </AppShell>
  );
}
