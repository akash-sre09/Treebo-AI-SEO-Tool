import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, Copy, Download, Globe, Loader2, Monitor, RefreshCw, Smartphone, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell, EmptyState, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { briefQuery, fmtDate, pageQuery } from "@/lib/brief-data";
import { buildLandingHtml, checkPage, type PageCopy, type PageStyle } from "@/lib/landing";
import { generatePage } from "@/lib/page.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pages/$id")({
  head: () => ({
    meta: [
      { title: "Landing Page Preview — Treebo AI Visibility Agent" },
      { name: "description", content: "Preview, check and export a generated Treebo landing page." },
      { property: "og:title", content: "Landing Page Preview — Treebo AI Visibility" },
      { property: "og:description", content: "Preview, check and export a generated Treebo landing page." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PagePreview,
});

function PagePreview() {
  const { id } = Route.useParams();
  const { data: page, isLoading } = useQuery(pageQuery(id));
  const { data: brief } = useQuery({ ...briefQuery(page?.brief_id ?? ""), enabled: !!page?.brief_id });
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [busy, setBusy] = useState(false);
  const [style, setStyle] = useState<PageStyle>("treebo");
  const gen = useServerFn(generatePage);
  const qc = useQueryClient();
  const navigate = useNavigate();
  if (isLoading) return <AppShell><p className="text-sm text-muted-foreground">Loading page…</p></AppShell>;
  if (!page) return <AppShell><EmptyState icon={Globe} title="Page not found" text="It may have been removed." /></AppShell>;
  const city = page.city as "Bangalore" | "Pune";
  const copy = page.copy as unknown as PageCopy | null;
  const html = copy && brief ? buildLandingHtml({ city, area: brief.brief.area, slug: page.slug, brief: brief.brief, copy, style }) : page.html;
  const checks = brief ? checkPage(html, brief.brief, city) : [];
  const fileName = `${page.slug.replace(/^\/|\/$/g, "") || "page"}${style === "generic" ? "-generic" : ""}.html`;

  const exportHtml = () => {
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };
  const regenerate = async () => {
    if (!page.brief_id) return;
    setBusy(true);
    try {
      const r = await gen({ data: { briefId: page.brief_id } });
      await qc.invalidateQueries({ queryKey: ["pages"] });
      navigate({ to: "/pages/$id", params: { id: r.id } });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not regenerate"); } finally { setBusy(false); }
  };

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <PageHeader title={page.slug} sub={`${page.city} · generated ${fmtDate(page.created_at)}`} />
        <div className="flex flex-wrap gap-2">
          {copy && (
            <div className="flex rounded-lg border bg-card p-1">
              {(["treebo", "generic"] as const).map((st) => (
                <button key={st} onClick={() => setStyle(st)} className={cn("rounded-md px-3 py-1.5 text-sm", style === st ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{st === "treebo" ? "Treebo style" : "Generic style"}</button>
              ))}
            </div>
          )}
          <div className="flex rounded-lg border bg-card p-1">
            {(["desktop", "mobile"] as const).map((d) => (
              <button key={d} onClick={() => setDevice(d)} className={cn("flex items-center gap-1 rounded-md px-3 py-1.5 text-sm capitalize", device === d ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                {d === "desktop" ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}{d}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={exportHtml}><Download className="h-4 w-4" /> Export HTML</Button>
          <Button variant="outline" onClick={async () => { await navigator.clipboard.writeText(html); toast.success("HTML copied"); }}><Copy className="h-4 w-4" /> Copy HTML</Button>
          <Button onClick={regenerate} disabled={busy || !page.brief_id}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Regenerate</Button>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {checks.map((c) => (
          <span key={c.id} title={c.detail} className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium", c.pass ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
            {c.pass ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}{c.label} · {c.detail}
          </span>
        ))}
      </div>
      <div className="app-preview-shell flex justify-center overflow-x-auto rounded-2xl border bg-muted/40 p-2 sm:p-4">
        <iframe title="Landing page preview" srcDoc={html} sandbox="allow-popups allow-popups-to-escape-sandbox"
          className={cn("h-[820px] max-w-full rounded-xl border bg-card shadow-card transition-all", device === "desktop" ? "w-full" : "w-[390px]")} />
      </div>
    </AppShell>
  );
}
