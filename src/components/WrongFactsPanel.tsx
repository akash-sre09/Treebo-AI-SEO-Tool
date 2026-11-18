import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isRed } from "@/lib/factcheck";
import { groupWrongFacts, wrongFactLabel, wrongFactSentence } from "@/lib/wrong-fact-display";
import type { City } from "@/data/seed";
import type { ProbeResult } from "@/lib/probe-data";
import { cn } from "@/lib/utils";

export function WrongFactsPanel({ city, results, open, onToggle, onAnswer }: {
  city: City; results: ProbeResult[]; open: boolean; onToggle: () => void; onAnswer: (answer: ProbeResult) => void;
}) {
  const groups = groupWrongFacts(results);
  return (
    <section className="mt-4 rounded-2xl border bg-card px-4 shadow-card" aria-labelledby="wrong-facts-title">
      <Button variant="ghost" onClick={onToggle} aria-expanded={open} aria-controls="wrong-facts-content" className="h-auto w-full justify-between whitespace-normal px-0 py-3">
        <h2 id="wrong-facts-title" className="text-sm font-semibold">Wrong facts — {city}</h2>
        <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
      </Button>
      {open && <div id="wrong-facts-content" className="pb-3">
          {!groups.length ? <p className="rounded-xl bg-secondary/40 p-4 text-sm text-muted-foreground">No wrong or unverified facts in the latest runs.</p> : <ul className="divide-y">
          {groups.map(({ key, fact, answers }) => {
            const first = answers[0];
            if (!first) return null;
            return <li key={key}>
              <Button variant="ghost" onClick={() => onAnswer(first)} className="h-auto w-full justify-start whitespace-normal px-2 py-3 text-left">
                <span aria-label={isRed(fact) ? "Red finding" : "Amber finding"} className={cn("mt-1 h-2 w-2 shrink-0 self-start rounded-full", isRed(fact) ? "bg-destructive" : "bg-warning")} />
                <span className="min-w-0 flex-1 space-y-1 break-words">
                  <span className="block text-sm"><span className={isRed(fact) ? "text-destructive" : "text-warning-foreground"}>{wrongFactLabel[fact.type]}</span> · {fact.hotel}{answers.length > 1 && <span className="ml-2 text-xs text-muted-foreground">×{answers.length} answers</span>}</span>
                  <span className="block text-xs font-normal">{wrongFactSentence(fact, city, first.prompt)}</span>
                  {answers.map((answer) => <span key={answer.id} className="block text-xs font-normal text-muted-foreground">{answer.engine === "gpt" ? "GPT" : "Gemini"} · {answer.prompt}</span>)}
                </span>
              </Button>
              {answers.length > 1 && <div className="flex flex-wrap gap-1 pb-2 pl-6">{answers.map((answer, i) => <Button key={answer.id} variant="link" size="sm" title={answer.prompt} onClick={() => onAnswer(answer)}>Answer {i + 1} · {answer.engine === "gpt" ? "GPT" : "Gemini"}</Button>)}</div>}
            </li>;
          })}
        </ul>}
      </div>}
    </section>
  );
}