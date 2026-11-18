import { describe, expect, it } from "vitest";
import { factCheck, scoreBrands, isRed, matchHotel, closestHotel, normalizeHotelName, hotelNamesMatch } from "@/lib/factcheck";
import { treeboHotels, prompts } from "@/data/seed";
import { checkWithVerified, type VerifiedHotel } from "@/lib/verified-hotels";

const ex = (hotels: { name: string; brand: string; locality: string | null; price: number | null }[]) => ({ brands: [], hotels, sources: [] });

describe("factCheck", () => {
  it("matches Itsy By Treebo - Hill View Ex to Hill View Executive within its city", () => {
    expect(hotelNamesMatch("Itsy By Treebo - Hill View Ex", "Itsy By Treebo Hill View Executive")).toBe(true);
    expect(matchHotel("Itsy By Treebo - Hill View Ex", "Pune")?.id).toBe("630");
    expect(matchHotel("Itsy By Treebo - Hill View Ex", "Bangalore")).toBeNull();
  });
  it("flags the abbreviated Hill View hotel claimed in the wrong area", () => {
    expect(factCheck(ex([{ name: "Itsy By Treebo - Hill View Ex", brand: "Treebo", locality: "Viman Nagar", price: null }]), "Pune")).toContainEqual({ type: "wrong_locality", hotel: "Itsy Hotels Hill View Ex", claimed: "Viman Nagar", actual: "Deccan" });
  });
  it("returns no closest hotel when name tokens do not overlap", () => {
    expect(closestHotel("Treebo Zqxvpl Palace", "Pune")).toBeNull();
    expect(closestHotel("Treebo Zqxvpl Palace", "Bangalore", "Koramangala")).toBeNull();
  });
  it("expands exec and nr and collapses punctuation without stripping parts of words", () => {
    expect(normalizeHotelName("Itsy By Treebo Hill.View Exec / Nr Station")).toBe("hill view executive near station");
    expect(normalizeHotelName("Treebo Bywater")).toBe("bywater");
  });
  it("flags a missing amenity as red", () => {
    const facts = factCheck({ brands: [], sources: [], hotels: [{ name: "Treebo White Inn Koramangala", brand: "Treebo", locality: null, price: null, amenities: ["Gym"] }] }, "Bangalore");
    expect(facts.map((f) => f.type)).toEqual(["wrong_amenity"]);
    expect(facts[0] && isRed(facts[0])).toBe(true);
  });
  it("accepts wifi, parking, AC and gym synonyms", () => {
    const seed = treeboHotels.find((h) => h.id === "4126");
    expect(seed).toBeDefined();
    if (!seed) return;
    for (const amenities of [["wifi", "parking", "AC", "gym"], ["wi-fi", "car parking", "air conditioning", "fitness centre"], ["free wifi", "free parking", "AC Room", "fitness center"]]) {
      expect(factCheck({ brands: [], sources: [], hotels: [{ name: seed.name, brand: "Treebo", locality: null, price: null, amenities }] }, "Bangalore")).toEqual([]);
    }
  });
  it("uses approved verified hotels but not pending or rejected ones", () => {
    const hotel: VerifiedHotel = { id: "website-1", name: "Treebo Website Test", city: "Pune", locality: "Hinjewadi", pricePerNight: 2000, rating: 4, reviewCount: 10, coupleFriendly: true, amenities: ["Free Wifi"], image: null, url: "https://www.treebo.com/hotels-in-pune/test-1/", source: "treebo.com", fetched_at: "2026-10-30T00:00:00Z", status: "approved", lookup_name: "Treebo Website Test", found: true };
    const extraction = { brands: [], sources: [], hotels: [{ name: hotel.name, brand: "Treebo", locality: "Hinjewadi", price: 2000, amenities: ["wi-fi"] }] };
    expect(checkWithVerified(extraction, "Pune", [hotel])).toEqual([]);
    for (const status of ["pending", "rejected"] as const) expect(checkWithVerified(extraction, "Pune", [{ ...hotel, status }])[0]?.type).toBe("unverified_treebo");
    expect(checkWithVerified(extraction, "Pune", [{ ...hotel, status: "rejected", found: false }])[0]).toMatchObject({ type: "hallucinated", actual: "Not found on treebo.com" });
  });
  it("includes two amenity questions per city with area and intent", () => {
    expect(prompts.filter((p) => p.city === "Bangalore" && /free parking|free wifi and air conditioning/.test(p.text)).map((p) => [p.locality, p.intent])).toEqual([["Koramangala", "business"], ["Indiranagar", "business"]]);
    expect(prompts.filter((p) => p.city === "Pune" && /with a gym|free wifi and parking/.test(p.text)).map((p) => [p.locality, p.intent])).toEqual([["Hinjewadi", "business"], ["Viman Nagar", "family"]]);
  });
  it("flags price more than 20% off the seed", () => {
    const hotel = treeboHotels.find((h) => h.city === "Bangalore" && h.pricePerNight != null);
    if (!hotel || hotel.pricePerNight == null) throw new Error("Expected a priced Bangalore hotel");
    expect(factCheck(ex([{ name: hotel.name, brand: "Treebo", locality: hotel.locality, price: Math.ceil(hotel.pricePerNight * 1.3) }]), "Bangalore").map((f) => f.type)).toEqual(["wrong_price"]);
  });
  it("accepts price within 20%", () => {
    const hotel = treeboHotels.find((h) => h.city === "Bangalore" && h.pricePerNight != null);
    if (!hotel || hotel.pricePerNight == null) throw new Error("Expected a priced Bangalore hotel");
    expect(factCheck(ex([{ name: hotel.name, brand: "Treebo", locality: hotel.locality, price: Math.round(hotel.pricePerNight * 1.1) }]), "Bangalore")).toEqual([]);
  });
  it("flags wrong locality", () => {
    expect(factCheck(ex([{ name: "Treebo Blu Orchid", brand: "Treebo", locality: "Whitefield", price: null }]), "Bangalore")[0]?.type).toBe("wrong_locality");
  });
  it("marks a Treebo-branded hotel not in our list as unverified (amber)", () => {
    expect(factCheck(ex([{ name: "Treebo Imaginary Palace", brand: "Treebo", locality: null, price: null }]), "Pune")[0]?.type).toBe("unverified_treebo");
  });
  it("marks a real Treebo hotel placed in the wrong city as hallucinated (red)", () => {
    expect(factCheck(ex([{ name: "Treebo Blu Orchid", brand: "Treebo", locality: "Kharadi", price: null }]), "Pune")[0]?.type).toBe("hallucinated");
  });
  it("marks another brand's hotel labelled Treebo as hallucinated", () => {
    expect(factCheck(ex([{ name: "OYO Townhouse 12", brand: "Treebo", locality: null, price: null }]), "Pune")[0]?.type).toBe("hallucinated");
  });
  it("ignores non-Treebo hotels", () => {
    expect(factCheck(ex([{ name: "OYO 123", brand: "OYO", locality: "X", price: 1 }]), "Pune")).toEqual([]);
  });
});

describe("scoreBrands", () => {
  it("ranks Treebo by order of mention", () => {
    expect(scoreBrands(["OYO", "FabHotels", "Treebo"]).treeboRank).toBe(3);
  });
});

import { findOpportunities } from "@/lib/opportunities";
describe("findOpportunities", () => {
  it("scores hotels×2 + competitors×2 + missed questions×3", () => {
    const r = [{ id: "1", prompt: "q", treebo_mentioned: false }, { id: "2", prompt: "q2", treebo_mentioned: true }];
    const o = findOpportunities("Pune", r, () => ({ locality: "Kharadi", intent: "budget" })).find((x) => x.area === "Kharadi");
    if (!o) throw new Error("Expected the Kharadi opportunity");
    const hotels = treeboHotels.filter((h) => h.city === "Pune" && h.locality === "Kharadi").length * 2;
    expect(o.breakdown).toEqual({ hotels, competitors: 2, missed: 3 });
    expect(o.score).toBe(hotels + 5);
  });
  it("skips areas where Treebo has no hotel", () => {
    expect(findOpportunities("Bangalore", [], () => null).every((o) => o.hotels.length > 0)).toBe(true);
  });
  it("couple page counts only couple-intent questions; generic page counts all area questions", () => {
    const r = [
      { id: "c", prompt: "couple", treebo_mentioned: false },
      { id: "b", prompt: "budget", treebo_mentioned: false },
    ];
    const meta = (p: string) => ({ locality: "Koramangala", intent: p as "couple" | "budget" });
    const opps = findOpportunities("Bangalore", r, meta);
    expect(opps.find((o) => o.slug === "/couple-friendly-hotels-in-koramangala")!.missed.map((m) => m.id)).toEqual(["c"]);
    expect(opps.find((o) => o.slug === "/hotels-in-koramangala")!.missed.length).toBe(2);
  });
});
