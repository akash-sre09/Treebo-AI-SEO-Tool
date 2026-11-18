import { treeboExistingPages, treeboHotels, type City } from "@/data/seed";

export interface BriefContent {
  metaTitle: string; metaDescription: string; h1: string; h2Outline: string[]; introAngle: string;
  faqs: { question: string; answer: string }[]; internalLinks: { anchor: string; slug: string }[];
  targetKeywords: string[]; schemaTypes: string[]; hotelsMentioned: string[];
}
export interface BriefCheck { id: string; label: string; pass: boolean; detail: string }

const norm = (s: string) => s.replace(/^\/+|\/+$/g, "").toLowerCase();

/** Every "Treebo …" / "Itsy Hotels …" name-like phrase in the text. */
export function brandPhrases(text: string): string[] {
  const re = /\b(?:Treebo|Itsy Hotels)(?:[ \t]+(?:[A-Z][\w&'.-]*|&))+/g;
  return [...new Set(text.match(re) ?? [])].map((p) => p.replace(/[.,]+$/, ""));
}

// Brand-generic phrases ("Treebo Stays", "Treebo Hotels in Koramangala") are not hotel names.
const GENERIC = /^(?:Treebo|Itsy Hotels)(?:\s+(?:Hotels?|Stays?|Rooms?|Properties|Options|Premium|Elite|Trend|Trip|Koramangala|Indiranagar|Bangalore|Pune|In|Near|Across|At|For|Of|The|And|Viman|Nagar|Kharadi|Baner|Hinjewadi|Station|Brigade|Road|Manyata|Tech|Park))+$/i;

/** Code checks for a generated brief. Pure — no AI involved. */
export function checkBrief(b: BriefContent, city: City, missedQuestions: string[] = []): BriefCheck[] {
  const cityHotels = treeboHotels.filter((h) => h.city === city);
  const isKnown = (name: string) => {
    const n = name.toLowerCase().trim();
    return cityHotels.some((h) => h.name.toLowerCase().startsWith(n) || n.startsWith(h.name.toLowerCase()));
  };
  const allText = [b.metaTitle, b.metaDescription, b.h1, b.introAngle, ...b.h2Outline, ...b.faqs.flatMap((f) => [f.question, f.answer])].join("\n");
  // "Treebo" alone (brand) is fine; flag phrases that look like a hotel name but aren't in the seed.
  const phrases = brandPhrases(allText).filter((p) => p.split(/\s+/).length > 1 && !GENERIC.test(p));
  const unknown = [...b.hotelsMentioned.filter((h) => !isKnown(h)), ...phrases.filter((p) => !isKnown(p))];
  const pages = new Set(treeboExistingPages[city].map(norm));
  const badLinks = b.internalLinks.filter((l) => !pages.has(norm(l.slug)));
  const prices = new Set(cityHotels.map((h) => h.pricePerNight).filter((p): p is number => p != null));
  // Budget figures quoted from the traveller's own question (e.g. "under ₹2000") are allowed.
  for (const q of missedQuestions) for (const m of q.matchAll(/₹\s?([\d,]+)/g)) prices.add(Number(m[1]!.replace(/,/g, "")));
  const badPrices = [...allText.matchAll(/₹\s?([\d,]+)/g)].map((m) => Number(m[1]!.replace(/,/g, ""))).filter((p) => !prices.has(p));
  return [
    { id: "title", label: "Meta title < 60 chars", pass: b.metaTitle.length < 60, detail: `${b.metaTitle.length} chars` },
    { id: "desc", label: "Meta description < 155 chars", pass: b.metaDescription.length < 155, detail: `${b.metaDescription.length} chars` },
    { id: "h2", label: "5–7 H2 sections", pass: b.h2Outline.length >= 5 && b.h2Outline.length <= 7, detail: `${b.h2Outline.length} sections` },
    { id: "faqs", label: "6 FAQs", pass: b.faqs.length === 6, detail: `${b.faqs.length} FAQs` },
    { id: "hotels", label: "Every hotel exists in seed", pass: unknown.length === 0, detail: unknown.length ? `Unknown: ${[...new Set(unknown)].join(", ")}` : `${b.hotelsMentioned.length} hotels, all verified` },
    { id: "prices", label: "Prices match seed", pass: badPrices.length === 0, detail: badPrices.length ? `Not in seed: ₹${badPrices.join(", ₹")}` : "All ₹ figures verified" },
    { id: "links", label: "Internal links exist", pass: badLinks.length === 0, detail: badLinks.length ? `Missing: ${badLinks.map((l) => l.slug).join(", ")}` : `${b.internalLinks.length} links OK` },
    { id: "schema", label: "Schema: Hotel + FAQPage", pass: ["Hotel", "FAQPage"].every((t) => b.schemaTypes.includes(t)), detail: b.schemaTypes.join(", ") },
  ];
}

export const LIMITS = { metaTitle: 60, metaDescription: 155 } as const;

/** Cut to strictly under `max` chars at the last word boundary; no ellipsis. */
export function trimToWord(s: string, max: number): string {
  const t = s.trim();
  if (t.length < max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > 0 ? cut.slice(0, sp) : cut).replace(/[\s,;:|–—-]+$/, "");
}
