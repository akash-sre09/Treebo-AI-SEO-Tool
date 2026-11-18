import { competitorPages, treeboExistingPages, treeboHotels, type City, type CompetitorPage, type Intent, type TreeboHotel } from "@/data/seed";

export interface ProbeLike { id: string; prompt: string; treebo_mentioned: boolean }
export interface PromptMeta { locality: string | null; intent: Intent | null }
export interface Opportunity {
  slug: string; city: City; area: string; intent: Intent | null;
  hotels: TreeboHotel[]; competitors: CompetitorPage[]; missed: ProbeLike[];
  breakdown: { hotels: number; competitors: number; missed: number }; score: number;
}

const normSlug = (s: string) => s.replace(/^\/+|\/+$/g, "").toLowerCase();

/** Intent a page slug targets; null = generic area page (matches every intent). */
export function slugIntent(slug: string): Intent | null {
  const s = slug.toLowerCase();
  if (/couple/.test(s)) return "couple";
  if (/budget|cheap/.test(s)) return "budget";
  if (/family/.test(s)) return "family";
  if (/business|corporate/.test(s)) return "business";
  if (/near-.*(station|airport)/.test(s)) return "transit";
  return null;
}

/**
 * Missing page = competitor slug Treebo lacks, where Treebo has ≥1 hotel in that area.
 * Score = hotels×2 + competitors with that page×2 + missed questions matching area AND intent×3.
 */
export function findOpportunities(city: City, results: ProbeLike[], metaOf: (prompt: string) => PromptMeta | null): Opportunity[] {
  const existing = new Set(treeboExistingPages[city].map(normSlug));
  const bySlug = new Map<string, CompetitorPage[]>();
  for (const c of competitorPages) {
    if (c.city !== city || existing.has(normSlug(c.slug))) continue;
    const k = normSlug(c.slug);
    bySlug.set(k, [...(bySlug.get(k) ?? []), c]);
  }
  const out: Opportunity[] = [];
  for (const [k, comps] of bySlug) {
    const area = comps[0]!.locality;
    const hotels = treeboHotels.filter((h) => h.city === city && h.locality === area);
    if (!hotels.length) continue;
    const intent = slugIntent(k);
    const brands = new Set(comps.map((c) => c.brand));
    const missed = results.filter((r) => {
      if (r.treebo_mentioned) return false;
      const m = metaOf(r.prompt);
      return m?.locality === area && (intent == null || m.intent === intent);
    });
    const breakdown = { hotels: hotels.length * 2, competitors: brands.size * 2, missed: missed.length * 3 };
    out.push({ slug: `/${k}`, city, area, intent, hotels, competitors: comps, missed, breakdown, score: breakdown.hotels + breakdown.competitors + breakdown.missed });
  }
  return out.sort((a, b) => b.score - a.score);
}
