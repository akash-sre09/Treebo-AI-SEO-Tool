import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTreeboAuth } from "@/lib/treebo-auth-middleware";

const lookup = z.object({ name: z.string().trim().min(3).max(200), city: z.enum(["Bangalore", "Pune"]) });

export const verifyHotel = createServerFn({ method: "POST" })
  .middleware([requireTreeboAuth])
  .inputValidator((input: unknown) => lookup.parse(input))
  .handler(async ({ data }) => {
    const { matchListing, parseTreeboHotel, sitemapHotelUrl } = await import("./treebo-parser");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const read = async (url: string) => {
      const requestUrl = new URL(url); requestUrl.searchParams.set("verification", "1");
      const response = await fetch(requestUrl, { headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`Treebo website could not be read (${response.status}). This does not mean the hotel is missing.`);
      return response.text();
    };
    const listing = await read(`https://www.treebo.com/hotels-in-${data.city.toLowerCase()}/`);
    const match = matchListing(listing, data.name, data.city);
    const { treeboHotels } = await import("@/data/seed");
    let url = match?.url ?? (match ? treeboHotels.find((h) => h.id === match.id && h.city === data.city)?.url : null);
    if (match && !url) url = sitemapHotelUrl(await read("https://www.treebo.com/sitemap-hotel.xml"), match.id, data.city);
    if (match && !url) throw new Error("Found on Treebo’s city listing, but its hotel page link could not be resolved. No facts were saved.");
    const hotel = match && url ? parseTreeboHotel(await read(url), url, data.city) : null;
    const { hotelNamesMatch } = await import("./factcheck");
    if (match && hotel && !hotelNamesMatch(match.name, hotel.name)) throw new Error("Treebo’s hotel page did not match its listing. No facts were saved.");
    const row = hotel ? { ...hotel, found: true, status: "pending" as const } : {
      id: `missing-${data.city.toLowerCase()}-${encodeURIComponent(data.name.toLowerCase())}`, name: data.name, city: data.city, found: false, status: "rejected" as const,
    };
    const { data: saved, error } = await supabaseAdmin.from("verified_hotels").upsert({ ...row, source: "treebo.com", lookup_name: data.name, fetched_at: new Date().toISOString() }, { onConflict: "city,lookup_name" }).select("*").single();
    if (error) throw new Error(error.message);
    return saved;
  });

export const reviewHotel = createServerFn({ method: "POST" })
  .middleware([requireTreeboAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().min(1).max(500), status: z.enum(["approved", "rejected"]) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("verified_hotels").select("found").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    if (!row.found && data.status === "approved") throw new Error("A hotel not found on Treebo cannot be approved.");
    const { error: updateError } = await supabaseAdmin.from("verified_hotels").update({ status: data.status }).eq("id", data.id);
    if (updateError) throw new Error(updateError.message);
    return { ok: true };
  });