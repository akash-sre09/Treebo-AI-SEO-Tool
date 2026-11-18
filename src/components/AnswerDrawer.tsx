import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { WrongFactBadges } from "@/components/WrongFactBadges";
import { isRed } from "@/lib/factcheck";
import { wrongFactSentence } from "@/lib/wrong-fact-display";
import { type ProbeResult } from "@/lib/probe-data";
import type { City } from "@/data/seed";
import { cn } from "@/lib/utils";

export function AnswerDrawer({ result, city, onClose }: { result: ProbeResult | null; city: City; onClose: () => void }) {
  return (
    <Sheet open={!!result} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto border-primary/15 sm:max-w-lg">
        {result && (
          <>
            <SheetHeader className="rounded-2xl border border-primary/10 bg-secondary/55 p-4 pr-10"><SheetTitle className="leading-relaxed text-primary">{result.prompt}</SheetTitle></SheetHeader>
            <div className="mt-4 space-y-4 px-4 pb-6">
              <WrongFactBadges facts={result.wrong_facts} city={city} question={result.prompt} />
              {result.wrong_facts.length > 0 && (
                <ul className="space-y-2 rounded-xl border border-destructive/15 bg-destructive/5 p-3.5 text-xs leading-relaxed">
                  {result.wrong_facts.map((f, i) => {
                    const amber = !isRed(f);
                    return (
                      <li key={i} className={cn("border-l-2 pl-2", amber ? "border-warning" : "border-destructive")}>
                        {wrongFactSentence(f, city, result.prompt)}
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed"><Highlighted text={result.answer_text} brands={result.brands} /></div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Highlighted({ text, brands }: { text: string; brands: string[] }) {
  const terms = [...new Set([...brands.filter((b) => b !== "Treebo"), "Treebo", "Itsy"])].filter((b) => b.length > 1);
  const esc = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length);
  const parts = text.split(new RegExp(`(${esc.join("|")})`, "gi"));
  return (
    <>
      {parts.map((p, i) => {
        const hit = terms.find((t) => t.toLowerCase() === p.toLowerCase());
        if (!hit) return <span key={i}>{p}</span>;
        return <mark key={i} className={cn("rounded px-0.5", /treebo|itsy/i.test(hit) ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>{p}</mark>;
      })}
    </>
  );
}
