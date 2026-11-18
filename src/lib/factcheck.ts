import { treeboHotels, type City, type TreeboHotel } from "@/data/seed";

export interface ExtractedHotel { name: string; brand: string; locality: string | null; price: number | null; amenities?: string[] }
export interface Extraction { brands: string[]; hotels: ExtractedHotel[]; sources: string[] }
/**
 * Red (counted as wrong facts): wrong_price, wrong_locality, hallucinated.
 * Amber (unverified, may exist): unverified_treebo. Legacy rows may carry "unknown_hotel" = amber.
 */
export type WrongFactType = "wrong_price" | "wrong_locality" | "wrong_amenity" | "hallucinated" | "unverified_treebo" | "unknown_hotel";
export interface WrongFact { type: WrongFactType; hotel: string; claimed: string; actual: string | null; area?: string | null; closest?: string | null }

export const isRed = (f: WrongFact) => f.type === "wrong_price" || f.type === "wrong_locality" || f.type === "wrong_amenity" || f.type === "hallucinated";
export const isAmber = (f: WrongFact) => !isRed(f);

export const isTreeboBrand = (b: string) => /treebo|itsy/i.test(b);
const OTHER_BRAND = /\b(oyo|fab ?hotels?|zostel|ginger|lemon tree|taj|marriott|hilton|hyatt|ibis|novotel|radisson|accor|sarovar|keys|bloom)\b/i;
export const normalizeHotelName = (s: string) => s.toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, " ")
  .replace(/\b(ex|exec)\b/g, "executive")
  .replace(/\bnr\b/g, "near")
  .replace(/\b(treebo|itsy|hotels?|premium|trend|by)\b/g, " ")
  .replace(/\s+/g, " ").trim();
const norm = normalizeHotelName;
export const hotelNamesMatch = (a: string, b: string) => {
  const x = norm(a), y = norm(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};
const tokens = (s: string) => new Set(norm(s).split(" ").filter((t) => t.length > 2));

function find(name: string, pool: TreeboHotel[]) {
  const n = norm(name);
  if (!n) return null;
  return pool.find((h) => norm(h.name) === n) ?? pool.find((h) => { const s = norm(h.name); return s.includes(n) || n.includes(s); }) ?? null;
}

export const matchHotel = (name: string, city: City, extra: TreeboHotel[] = []) => find(name, [...treeboHotels, ...extra].filter((h) => h.city === city));

export function normalizeAmenity(value: string) {
  const n = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (/^(free|complimentary)?wifi$/.test(n)) return "wifi";
  if (/^(free|car|freecar)?parking$/.test(n)) return "parking";
  if (["ac", "acroom", "airconditioning", "airconditioned", "airconditionedrooms"].includes(n)) return "ac";
  if (["gym", "gymnasium", "fitnesscentre", "fitnesscenter"].includes(n)) return "gym";
  return n;
}

const sameArea = (a: string, b: string) => { const x = a.toLowerCase(), y = b.toLowerCase(); return x.includes(y) || y.includes(x); };

/** Nearest verified hotel by name, preferring the claimed area. */
export function closestHotel(name: string, city: City, area?: string | null): TreeboHotel | null {
  const cityPool = treeboHotels.filter((h) => h.city === city);
  const areaPool = area ? cityPool.filter((h) => sameArea(h.locality, area)) : [];
  const pool = areaPool.length ? areaPool : cityPool;
  const t = tokens(name);
  let best: TreeboHotel | null = null, bestScore = -1;
  for (const h of pool) {
    const s = [...tokens(h.name)].filter((x) => t.has(x)).length;
    if (s > bestScore) { best = h; bestScore = s; }
  }
  return bestScore > 0 ? best : null;
}

/** Fixed rules: price off by >20%, wrong locality/city, invented vs unverified Treebo hotel. */
export function factCheck(ex: Extraction, city: City, extra: TreeboHotel[] = [], notFound: string[] = []): WrongFact[] {
  const out: WrongFact[] = [];
  const other: City = city === "Bangalore" ? "Pune" : "Bangalore";
  for (const h of ex.hotels) {
    if (!isTreeboBrand(h.brand) && !isTreeboBrand(h.name)) continue;
    const seed = matchHotel(h.name, city, extra);
    if (!seed) {
      const elsewhere = matchHotel(h.name, other, extra);
      const closest = closestHotel(h.name, city, h.locality)?.name ?? null;
      if (notFound.some((name) => norm(name) === norm(h.name))) out.push({ type: "hallucinated", hotel: h.name, claimed: h.name, actual: "Not found on treebo.com", area: h.locality, closest });
      else if (elsewhere) out.push({ type: "hallucinated", hotel: h.name, claimed: `${h.name}${h.locality ? `, ${h.locality}` : ""} (${city})`, actual: `${elsewhere.name} is in ${elsewhere.locality}, ${other}`, area: h.locality, closest });
      else if (OTHER_BRAND.test(h.name)) out.push({ type: "hallucinated", hotel: h.name, claimed: `${h.name} as a Treebo hotel`, actual: "Not Treebo inventory", area: h.locality, closest });
      else out.push({ type: "unverified_treebo", hotel: h.name, claimed: `${h.name}${h.locality ? `, ${h.locality}` : ""}`, actual: null, area: h.locality, closest });
      continue;
    }
    if (h.price != null && seed.pricePerNight != null && Math.abs(h.price - seed.pricePerNight) / seed.pricePerNight > 0.2)
      out.push({ type: "wrong_price", hotel: seed.name, claimed: `₹${h.price}`, actual: `₹${seed.pricePerNight}` });
    if (h.locality && !sameArea(h.locality, seed.locality))
      out.push({ type: "wrong_locality", hotel: seed.name, claimed: h.locality, actual: seed.locality });
    const known = new Set(seed.amenities.map(normalizeAmenity));
    for (const amenity of [...new Set((h.amenities ?? []).map(normalizeAmenity))]) {
      if (amenity && !known.has(amenity)) out.push({ type: "wrong_amenity", hotel: seed.name, claimed: (h.amenities ?? []).find((a) => normalizeAmenity(a) === amenity) ?? amenity, actual: `Not listed on treebo.com. Listed amenities: ${seed.amenities.join(", ")}` });
    }
  }
  return out;
}

export const BUDGET = /oyo|fab ?hotel|zostel|ginger|lemon tree|treebo|itsy|bloom|keys|sarovar|independent/i;
export const PREMIUM = /accor|marriott|hilton|taj|ihcl|hyatt|leela|oberoi|itc|radisson|wyndham|four seasons|ritz|novotel|ibis|grand mercure|sheraton|westin|jw|courtyard|holiday inn|ihg|crowne|vivanta|conrad|st\.? regis|shangri|fairfield|aloft|le meridien|chancery|octave/i;
/** Budget/midscale unless it's a known premium chain (local independents count as budget). */
export const brandGroup = (b: string): "budget" | "premium" => (BUDGET.test(b) ? "budget" : PREMIUM.test(b) ? "premium" : "budget");

export function scoreBrands(brands: string[]) {
  const ordered: string[] = [];
  for (const b of brands) {
    const name = isTreeboBrand(b) ? "Treebo" : /^fab ?hotel/i.test(b) ? "FabHotels" : /^oyo/i.test(b) ? "OYO" : b.trim();
    if (name && !ordered.some((o) => o.toLowerCase() === name.toLowerCase())) ordered.push(name);
  }
  const idx = ordered.indexOf("Treebo");
  return { ordered, treeboMentioned: idx >= 0, treeboRank: idx >= 0 ? idx + 1 : null, competitors: ordered.filter((b) => b !== "Treebo") };
}
