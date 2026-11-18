import { describe, expect, it } from "vitest";
import { isNoise, trackPage, type RunWithAnswers } from "@/lib/probe-data";

const run = (id: string, engine: string, at: string, mentioned: boolean): RunWithAnswers => ({ id, engine, created_at: at, answers: [{ prompt: "q1", treebo_mentioned: mentioned, treebo_rank: mentioned ? 1 : null }] });

describe("trackPage", () => {
  it("is baseline until published", () => {
    expect(trackPage(["q1"], [run("a", "gemini", "2026-10-01T00:00:00Z", false)], null).status).toBe("baseline");
  });
  it("awaits a probe after the publish date", () => {
    expect(trackPage(["q1"], [run("a", "gemini", "2026-10-01T00:00:00Z", false)], "2026-10-05T00:00:00Z").status).toBe("awaiting");
  });
  it("shows change since publishing", () => {
    const t = trackPage(["q1"], [run("a", "gemini", "2026-10-01T00:00:00Z", false), run("b", "gemini", "2026-10-10T00:00:00Z", true)], "2026-10-05T00:00:00Z");
    expect(t.status).toBe("tracking");
    expect(t.change).toBe(1);
  });
});

describe("isNoise", () => {
  it("treats changes under ±10 points as normal", () => {
    expect(isNoise(9)).toBe(true);
    expect(isNoise(-9.5)).toBe(true);
    expect(isNoise(10)).toBe(false);
    expect(isNoise(-12)).toBe(false);
  });
});
