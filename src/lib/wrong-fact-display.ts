import { closestHotel, isRed, type WrongFact } from "@/lib/factcheck";
import { prompts, type City } from "@/data/seed";
import type { ProbeResult } from "@/lib/probe-data";

export const wrongFactLabel: Record<WrongFact["type"], string> = {
  wrong_price: "Wrong price", wrong_locality: "Wrong area", wrong_amenity: "Wrong amenity",
  hallucinated: "Hallucinated hotel", unverified_treebo: "Unverified Treebo hotel", unknown_hotel: "Unverified Treebo hotel",
};

/** Presentation only: never changes the finding or verified inventory. */
export function wrongFactSentence(fact: WrongFact, city?: City, question?: string) {
  const nameFinding = ["hallucinated", "unverified_treebo", "unknown_hotel"].includes(fact.type);
  const area = fact.area ?? prompts.find((p) => p.text === question)?.locality;
  // Recompute saved suggestions against today's inventory; old findings may contain unrelated fallbacks.
  const closest = nameFinding ? (city ? closestHotel(fact.hotel, city, area)?.name : fact.closest) : null;
  return `AI said: ${fact.claimed} → Actual: ${fact.actual ?? "not in verified list"}${nameFinding ? closest ? `. Closest on file: ${closest}` : ". No similar hotel on file" : ""}`;
}

export function groupWrongFacts(results: ProbeResult[]) {
  const groups = new Map<string, { key: string; fact: WrongFact; answers: ProbeResult[] }>();
  for (const answer of results) {
    for (const fact of answer.wrong_facts ?? []) {
      const key = JSON.stringify([fact.type, fact.hotel, fact.claimed]);
      const group = groups.get(key);
      if (group) {
        if (!group.answers.some((r) => r.id === answer.id)) group.answers.push(answer);
      } else groups.set(key, { key, fact, answers: [answer] });
    }
  }
  return [...groups.values()].sort((a, b) => Number(isRed(b.fact)) - Number(isRed(a.fact)));
}