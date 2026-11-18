import { describe, expect, it } from "vitest";
import { buildLandingHtml, checkPage } from "@/lib/landing";
import { trimToWord } from "@/lib/briefcheck";
import type { BriefContent } from "@/lib/briefcheck";
import { treeboHotels } from "@/data/seed";

const brief: BriefContent = {
  metaTitle: "Hotels in Hinjewadi", metaDescription: "d", h1: "Hotels in Hinjewadi", h2Outline: [], introAngle: "",
  faqs: [{ question: "Is it \"safe\" & clean?", answer: "Yes." }], internalLinks: [{ anchor: "Pune", slug: "/hotels-in-pune/" }],
  targetKeywords: [], schemaTypes: [], hotelsMentioned: [],
};
const copy = { heroHeadline: "h", heroSubline: "s", intro: "i", whyStay: [{ title: "a", text: "b" }] };
const html = buildLandingHtml({ city: "Pune", area: "Hinjewadi", slug: "/hotels-in-hinjewadi", brief, copy });

describe("landing page", () => {
  it("passes all checks for a seed-built page", () => expect(checkPage(html, brief, "Pune").every((c) => c.pass)).toBe(true));
  it("shows prices only for hotels with a seed price", () => {
    const expected = treeboHotels.filter((h) => h.city === "Pune" && h.locality === "Hinjewadi" && h.pricePerNight != null).length;
    expect((html.match(/class="hc-price"/g) ?? []).length).toBe(expected);
  });
  it("generic style also passes all checks", () => {
    const g = buildLandingHtml({ city: "Pune", area: "Hinjewadi", slug: "/hotels-in-hinjewadi", brief, copy, style: "generic" });
    expect(checkPage(g, brief, "Pune").every((c) => c.pass)).toBe(true);
  });
  it("uses the treebo.com hotel photo on cards", () => expect(html).toContain("cs-images.treebo.com"));
  it("one card per seed hotel in the area", () => expect((html.match(/data-hotel-id=/g) ?? []).length).toBe(treeboHotels.filter((h) => h.city === "Pune" && h.locality === "Hinjewadi").length));
  it("flags a non-treebo Book link", () => {
    const bad = html.replace(/<a class="btn" href="[^"]+"/, '<a class="btn" href="https://oyo.com/x"');
    expect(checkPage(bad, brief, "Pune").find((c) => c.id === "book")!.pass).toBe(false);
  });
  it("flags two H1s", () => expect(checkPage(html.replace("<main", "<h1>x</h1><main"), brief, "Pune").find((c) => c.id === "h1")!.pass).toBe(false));
});

describe("trimToWord", () => {
  it("cuts under the limit at a word boundary with no ellipsis", () => {
    const t = trimToWord("Book verified Treebo hotels in Koramangala from ₹1534 per night today", 40);
    expect(t.length).toBeLessThan(40);
    expect(t).toBe("Book verified Treebo hotels in");
  });
});
