import { describe, expect, it } from "vitest";
import { groupWrongFacts } from "@/lib/wrong-fact-display";
import type { ProbeResult } from "@/lib/probe-data";
import type { WrongFact } from "@/lib/factcheck";

const amber: WrongFact = { type: "unverified_treebo", hotel: "Treebo Example", claimed: "Treebo Example", actual: null };
const red: WrongFact = { type: "wrong_price", hotel: "Treebo White Inn Koramangala", claimed: "₹3000", actual: "₹1551" };
const result = (id: string, facts: WrongFact[]): ProbeResult => ({ id, run_id: "run", prompt: "Question", engine: "gemini", answer_text: "Answer", treebo_mentioned: true, treebo_rank: 1, competitors_mentioned: [], brands: ["Treebo"], wrong_facts: facts, sources: [] });

describe("wrong-fact answer grouping", () => {
  it("groups same type, hotel and claim across three answers", () => {
    const groups = groupWrongFacts([result("1", [red]), result("2", [red]), result("3", [red])]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.answers.map((r) => r.id)).toEqual(["1", "2", "3"]);
  });
  it("places red findings before amber", () => {
    expect(groupWrongFacts([result("1", [amber, red])]).map((g) => g.fact.type)).toEqual(["wrong_price", "unverified_treebo"]);
  });
  it("keeps different types, hotels and claims separate", () => {
    expect(groupWrongFacts([result("1", [red, { ...red, type: "wrong_locality" }, { ...red, hotel: "Other" }, { ...red, claimed: "₹4000" }])])).toHaveLength(4);
  });
  it("counts answers rather than duplicate findings in one answer", () => {
    expect(groupWrongFacts([result("1", [red, red])])[0]?.answers).toHaveLength(1);
  });
});