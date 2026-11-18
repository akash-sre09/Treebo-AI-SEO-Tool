import { describe, expect, it } from "vitest";
import { checkBrief, type BriefContent } from "@/lib/briefcheck";
import { treeboHotels } from "@/data/seed";

const reference = treeboHotels.find((h) => h.id === "3119");
if (!reference) throw new Error("Existing White Inn Koramangala seed must be preserved");
const referenceCopy = reference.pricePerNight == null ? `Stay at ${reference.name}.` : `Stay at ${reference.name} from ₹${reference.pricePerNight}.`;

const base: BriefContent = {
  metaTitle: "Hotels in Koramangala | Treebo", metaDescription: referenceCopy,
  h1: "Hotels in Koramangala", h2Outline: ["a", "b", "c", "d", "e"], introAngle: "x",
  faqs: Array.from({ length: 6 }, (_, i) => ({ question: `q${i}`, answer: "a" })),
  internalLinks: [{ anchor: "Bangalore", slug: "/hotels-in-bangalore/" }], targetKeywords: ["k"],
  schemaTypes: ["Hotel", "FAQPage"], hotelsMentioned: ["Treebo White Inn Koramangala"],
};
const get = (b: BriefContent, id: string) => checkBrief(b, "Bangalore").find((c) => c.id === id)!.pass;

describe("checkBrief", () => {
  it("passes a clean brief", () => expect(checkBrief(base, "Bangalore").every((c) => c.pass)).toBe(true));
  it("meta title must be under 60 chars", () => expect(get({ ...base, metaTitle: "x".repeat(60) }, "title")).toBe(false));
  it("meta description must be under 155 chars", () => expect(get({ ...base, metaDescription: "x".repeat(155) }, "desc")).toBe(false));
  it("flags a hotel not in the seed", () => expect(get({ ...base, faqs: [...base.faqs.slice(1), { question: "q", answer: "Try Treebo Sunrise Palace." }] }, "hotels")).toBe(false));
  it("flags an internal link Treebo doesn't have", () => expect(get({ ...base, internalLinks: [{ anchor: "x", slug: "/hotels-in-hsr/" }] }, "links")).toBe(false));
  it("flags a price not in the seed", () => expect(get({ ...base, metaDescription: "From ₹999" }, "prices")).toBe(false));
  it("allows a budget figure quoted from a missed question", () => expect(checkBrief({ ...base, h1: "Under ₹2000" }, "Bangalore", ["Best budget hotel under ₹2000"]).find((c) => c.id === "prices")!.pass).toBe(true));
  it("ignores generic headings like Explore Treebo Options Across Pune", () => expect(get({ ...base, h2Outline: [...base.h2Outline, "Explore Treebo Options Across Pune"] }, "hotels")).toBe(true));
  it("ignores generic brand phrases like Treebo Stays", () => expect(get({ ...base, metaTitle: "Treebo Stays from ₹1551" }, "hotels")).toBe(true));
});
