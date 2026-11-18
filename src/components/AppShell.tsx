import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Radar, Lightbulb, FileText, Globe, Check, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { briefsListQuery, fmtDate, pagesListQuery } from "@/lib/brief-data";
import { DemoBar } from "@/components/DemoBar";
import { cn } from "@/lib/utils";
import { useTreeboAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/probe", label: "AI Probe", icon: Radar },
  { to: "/opportunities", label: "Opportunities", icon: Lightbulb },
  { to: "/briefs", label: "Briefs", icon: FileText },
  { to: "/pages", label: "Pages", icon: Globe },
] as const;

const steps = [
  { label: "Select City", to: "/" },
  { label: "Find Opportunity", to: "/opportunities" },
  { label: "Analyze AI Answers", to: "/probe" },
  { label: "Brief", to: "/briefs" },
  { label: "Landing Page", to: "/pages" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useTreeboAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const activeStep = Math.max(0, steps.findIndex((s) => (s.to === "/" ? path === "/" : path.startsWith(s.to.replace(/\/$/, "")))));
  const { data: briefs = [] } = useQuery(briefsListQuery());
  const { data: pages = [] } = useQuery(pagesListQuery());
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="app-sidebar hidden w-72 shrink-0 flex-col overflow-y-auto p-5 text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen">
        <div className="mb-8 flex items-center gap-3 px-1">
          <div className="app-brand-emblem" aria-hidden="true">T</div>
          <div className="min-w-0">
            <div className="app-brand-name">Treebo</div>
            <div className="app-brand-product">AI Visibility</div>
          </div>
        </div>
        <nav className="space-y-1.5" aria-label="Main navigation">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "app-nav-item flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                (to === "/" ? path === to : path.startsWith(to.replace(/\/$/, ""))) && "app-nav-item-active bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", (to === "/" ? path === to : path.startsWith(to.replace(/\/$/, ""))) && "text-sidebar-primary")} />
              {label}
            </Link>
          ))}
        </nav>
        {briefs.length > 0 && (
          <div className="mt-7 min-h-0 overflow-y-auto px-1">
            <div className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.16em] text-sidebar-primary">Briefs</div>
            <ul className="space-y-1">
              {briefs.map((b) => (
                <li key={b.id}>
                  <Link to="/briefs/$id" params={{ id: b.id }} className={cn("block rounded-lg border border-transparent px-3 py-2 text-xs transition-colors hover:border-sidebar-border hover:bg-sidebar-accent", path === `/briefs/${b.id}` && "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground")}>
                    <div className="truncate font-mono">{b.slug}</div>
                    <div className="mt-0.5 opacity-60">{b.city} · {fmtDate(b.created_at)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {pages.length > 0 && (
          <div className="mt-5 min-h-0 overflow-y-auto px-1">
            <div className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.16em] text-sidebar-primary">Pages</div>
            <ul className="space-y-1">
              {pages.map((b) => (
                <li key={b.id}>
                  <Link to="/pages/$id" params={{ id: b.id }} className={cn("block rounded-lg border border-transparent px-3 py-2 text-xs transition-colors hover:border-sidebar-border hover:bg-sidebar-accent", path === `/pages/${b.id}` && "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground")}>
                    <div className="truncate font-mono">{b.slug}</div>
                    <div className="mt-0.5 opacity-60">{b.city} · {fmtDate(b.created_at)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-auto space-y-3 pt-6">
          <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-3.5 text-xs shadow-sm">
            <div className="mb-1 text-[10px] uppercase tracking-[0.12em] opacity-60">Signed in as</div>
            <div className="break-all text-sidebar-accent-foreground">{loading ? "Checking account…" : user?.email}</div>
            <Button variant="ghost" size="sm" onClick={() => void signOut()} className="mt-2 w-full justify-start rounded-lg px-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-primary">
              <LogOut /> Sign out
            </Button>
          </div>
          <div className="rounded-xl border border-sidebar-border px-3 py-2.5 text-xs opacity-75">Scope: Bangalore &amp; Pune</div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b bg-card/95 px-4 py-3 shadow-sm md:px-8">
          <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 md:hidden">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-sidebar-primary bg-primary text-sm font-bold text-primary-foreground" aria-hidden="true">T</span>
              <span className="min-w-0">
                <span className="block text-[8px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Treebo</span>
                <span className="block truncate text-xs font-bold uppercase text-primary">AI Visibility</span>
              </span>
            </div>
            <div className="flex min-w-0 flex-col items-end gap-1">
              <span className="max-w-28 truncate text-[10px] text-muted-foreground min-[420px]:max-w-44">{loading ? "Checking account…" : user?.email}</span>
              <Button variant="outline" size="sm" onClick={() => void signOut()} className="h-7 px-2.5"><LogOut /> Sign out</Button>
            </div>
          </div>
          <nav className="mb-3 flex gap-1.5 overflow-x-auto pb-1 md:hidden" aria-label="Mobile navigation">
            {nav.map(({ to, label }) => (
              <Link key={to} to={to} className={cn("shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors", (to === "/" ? path === to : path.startsWith(to.replace(/\/$/, ""))) ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-secondary/45 text-secondary-foreground")}>
                {label}
              </Link>
            ))}
          </nav>
          <ol className="flex items-center gap-2 overflow-x-auto pb-1 text-xs" aria-label="Workflow progress">
            {steps.map((s, i) => (
              <li key={s.label} className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors", i < activeStep ? "border-primary bg-primary text-primary-foreground" : i === activeStep ? "border-sidebar-primary bg-card text-primary ring-2 ring-sidebar-primary/20" : "border-border bg-muted/50 text-muted-foreground")}>
                  {i < activeStep ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className={i === activeStep ? "font-semibold text-primary" : "text-muted-foreground"}>{s.label}</span>
                {i < steps.length - 1 && <span className={cn("mx-1 h-px w-7 rounded-full", i < activeStep ? "bg-primary/45" : "bg-border")} />}
              </li>
            ))}
          </ol>
        </header>
        <DemoBar />
        <main className="app-main flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text }: { icon: typeof Radar; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-primary/25 bg-card px-6 py-16 text-center shadow-card">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground ring-4 ring-secondary/45">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-primary">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

export function PageHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="app-page-header mb-6 min-w-0">
      <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{sub}</p>
    </div>
  );
}
