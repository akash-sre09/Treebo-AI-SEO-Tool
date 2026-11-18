import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/AppShell";
import { briefsListQuery, fmtDate } from "@/lib/brief-data";

export const Route = createFileRoute("/_authenticated/briefs/")({
  head: () => ({
    meta: [
      { title: "Content Briefs — Treebo AI Visibility Agent" },
      { name: "description", content: "SEO briefs built only from verified Treebo facts." },
      { property: "og:title", content: "Content Briefs — Treebo AI Visibility" },
      { property: "og:description", content: "SEO briefs built only from verified Treebo facts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Briefs,
});

function Briefs() {
  const { data = [] } = useQuery(briefsListQuery());
  return (
    <AppShell>
      <PageHeader title="Content Briefs" sub="SEO briefs built only from verified Treebo facts. Every generation is kept." />
      {!data.length ? <EmptyState icon={FileText} title="No briefs yet" text="Generate a brief from any opportunity to see it here." /> : (
        <ul className="divide-y rounded-2xl border bg-card shadow-card">
          {data.map((b) => (
            <li key={b.id}><Link to="/briefs/$id" params={{ id: b.id }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/45">
              <span className="min-w-0 truncate font-mono text-sm font-medium text-primary">{b.slug}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{b.city} · {fmtDate(b.created_at)}</span>
            </Link></li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
