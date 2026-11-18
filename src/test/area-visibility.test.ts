import { describe, expect, it } from "vitest";
import { prompts, treeboHotels, type City } from "@/data/seed";
import { areaVisibility } from "@/lib/probe-data";

function question(city: City, area: string) {
  const p = prompts.find((p) => p.city === city && p.locality === area);
  if (!p) throw new Error(`Missing seed question for ${area}`);
  return p.text;
}
const answer = (prompt: string, mentioned: boolean, competitors: string[] = []) => ({ prompt, treebo_mentioned: mentioned, competitors_mentioned: competitors });

describe("areaVisibility", () => {
  const koramangala = question("Bangalore", "Koramangala");
  it("counts actual answers across engines, not unanswered seed questions, and scopes to city", () => {
    const rows = areaVisibility([answer(koramangala, true), answer(koramangala, false), answer(question("Pune", "Viman Nagar"), true)], "Bangalore");
    expect(rows.find((r) => r.area === "Koramangala")).toMatchObject({ mentioned: 1, total: 2, mentionRate: 0.5 });
    expect(rows.map((r) => r.area).sort()).toEqual([...new Set(prompts.filter((p) => p.city === "Bangalore").map((p) => p.locality))].sort());
  });
  it("normalizes competitors like share of voice, deduplicates per answer and returns the top two", () => {
    const rows = areaVisibility([answer(koramangala, false, ["Fab Hotels", "FabHotels", "Oyo Rooms", "Treebo", "Marriott"]), answer(koramangala, false, ["fab hotels", "OYO", "Ginger"]), answer(koramangala, false, ["OYO"])], "Bangalore");
    expect(rows.find((r) => r.area === "Koramangala")?.competitors).toEqual(["OYO", "FabHotels"]);
  });
  it("marks zero mentions Invisible only with seed hotels and counts locality inventory", () => {
    const rows = areaVisibility([answer(koramangala, false)], "Bangalore");
    const row = rows.find((r) => r.area === "Koramangala");
    expect(row?.hotels).toBe(treeboHotels.filter((h) => h.city === "Bangalore" && h.locality === "Koramangala").length);
    expect(row?.status).toBe("Invisible");
    for (const r of rows.filter((r) => r.hotels === 0)) expect(r.status).toBeNull();
  });
  it("marks Strong at 50 percent, but not below", () => {
    expect(areaVisibility([answer(koramangala, true), answer(koramangala, false)], "Bangalore").find((r) => r.area === "Koramangala")?.status).toBe("Strong");
    expect(areaVisibility([answer(koramangala, true), answer(koramangala, false), answer(koramangala, false)], "Bangalore").find((r) => r.area === "Koramangala")?.status).toBeNull();
  });
  it("sorts lowest mention rates first, then most hotels", () => {
    const rows = areaVisibility([answer(koramangala, true)], "Bangalore");
    expect(rows.at(-1)?.area).toBe("Koramangala");
    for (let i = 1; i < rows.length; i++) {
      const current = rows[i], previous = rows[i - 1];
      if (!current || !previous) throw new Error("Missing area row");
      expect(current.mentionRate).toBeGreaterThanOrEqual(previous.mentionRate);
      if (current.mentionRate === previous.mentionRate) expect(current.hotels).toBeLessThanOrEqual(previous.hotels);
    }
  });
});