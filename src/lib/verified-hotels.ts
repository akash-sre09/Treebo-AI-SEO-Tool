import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { City, TreeboHotel } from "@/data/seed";
import { factCheck, normalizeHotelName, type Extraction, type WrongFact } from "./factcheck";

export interface VerifiedHotel extends TreeboHotel {
  source: "treebo.com";
  fetched_at: string;
  status: "pending" | "approved" | "rejected";
  lookup_name: string;
  found: boolean;
}

export const verifiedHotelsQuery = (city: City) => queryOptions({
  queryKey: ["verifiedHotels", city],
  queryFn: async () => {
    const { data, error } = await supabase.from("verified_hotels").select("*").eq("city", city);
    if (error) throw error;
    return (data ?? []) as VerifiedHotel[];
  },
});

export function checkWithVerified(ex: Extraction, city: City, hotels: VerifiedHotel[]) {
  return factCheck(ex, city, hotels.filter((h) => h.found && h.status === "approved"), hotels.filter((h) => h.city === city && !h.found).map((h) => h.lookup_name));
}

/** Legacy runs did not save extraction. Reclassify name findings only, without inventing claims. */
export function reviewLegacyFacts(facts: WrongFact[], city: City, hotels: VerifiedHotel[]) {
  return facts.flatMap((f) => {
    if (f.type !== "unverified_treebo" && f.type !== "unknown_hotel") return [f];
    const confirmedMissing = hotels.some((h) => !h.found && normalizeHotelName(h.lookup_name) === normalizeHotelName(f.hotel));
    const checked = checkWithVerified({ brands: [], sources: [], hotels: [{ name: f.hotel, brand: "Treebo", locality: null, price: null }] }, city, hotels);
    if (confirmedMissing) return checked;
    return checked.length ? [f] : [];
  });
}