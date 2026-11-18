import { isRed, type WrongFact } from "@/lib/factcheck";
import { cn } from "@/lib/utils";
import { wrongFactLabel, wrongFactSentence } from "@/lib/wrong-fact-display";
import type { City } from "@/data/seed";

export function WrongFactBadges({ facts, city, question }: { facts: WrongFact[]; city?: City; question?: string }) {
  if (!facts?.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {facts.map((f, i) => (
        <span key={i} title={`${wrongFactLabel[f.type]} · ${f.hotel}\n${wrongFactSentence(f, city, question)}`} className={cn("min-w-0 max-w-56 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-sm", isRed(f) ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-warning/25 bg-warning/15 text-warning-foreground")}>
          <span className="block truncate">{wrongFactLabel[f.type]}</span>
          <span className="block truncate font-normal">{wrongFactSentence(f, city, question)}</span>
        </span>
      ))}
    </div>
  );
}
