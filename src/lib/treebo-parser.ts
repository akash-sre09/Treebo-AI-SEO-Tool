import { parseDocument } from "htmlparser2";
import { findAll, textContent, getAttributeValue } from "domutils";
import { hotelNamesMatch } from "./factcheck";
import type { City, TreeboHotel } from "@/data/seed";

/** Read JSON assignments without executing any website JavaScript. */
export function assignedJson(html: string, variable: string): unknown {
  const marker = new RegExp(`window\\.${variable}\\s*=`).exec(html);
  if (!marker) return null;
  const start = html.indexOf("{", marker.index + marker[0].length);
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i >= 0 && i < html.length; i++) {
    const c = html[i];
    if (quoted) { if (escaped) escaped = false; else if (c === "\\") escaped = true; else if (c === '"') quoted = false; continue; }
    if (c === '"') quoted = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) { try { return JSON.parse(html.slice(start, i + 1)); } catch { return null; } }
  }
  return null;
}

export function treeboUrl(value: string, city: City) {
  const u = new URL(value, "https://www.treebo.com");
  if (u.protocol !== "https:" || u.hostname !== "www.treebo.com" || !u.pathname.startsWith(`/hotels-in-${city.toLowerCase()}/`)) throw new Error("Invalid Treebo hotel URL");
  return u.href;
}

export function listingHotels(html: string, city: City) {
  const doc = parseDocument(html);
  const nodes = findAll((e) => e.name === "a", doc.children);
  const hotels = nodes.flatMap((e) => {
    const href = getAttributeValue(e, "href");
    if (!href) return [];
    try {
      const url = treeboUrl(href, city);
      if (!/-\d+\/$/.test(new URL(url).pathname)) return [];
      const text = textContent(e).trim();
      const headings = findAll((n) => /^h[1-6]$/.test(n.name), e.children);
      const name = headings[0] ? textContent(headings[0]).trim() : text;
      return name ? [{ name, url: url as string | null, id: new URL(url).pathname.match(/-(\d+)\/$/)?.[1] ?? "" }] : [];
    } catch { return []; }
  });
  const apollo = assignedJson(html, "__APOLLO_STATE__");
  if (apollo && typeof apollo === "object") {
    for (const value of Object.values(apollo)) {
      if (!value || typeof value !== "object") continue;
      const item = value as Record<string, unknown>;
      if (item["__typename"] === "HotelSearchItem" && typeof item["name"] === "string" && item["id"] != null) {
        hotels.push({ name: item["name"], id: String(item["id"]), url: null });
      }
    }
  }
  // An empty/blocked/client-only response is not evidence that a hotel is missing.
  if (!hotels.length) throw new Error("Treebo did not provide a readable hotel listing. No missing-hotel finding was saved.");
  return hotels;
}

export function matchListing(html: string, name: string, city: City) {
  return listingHotels(html, city).find((h) => hotelNamesMatch(h.name, name)) ?? null;
}

export function sitemapHotelUrl(xml: string, id: string, city: City) {
  const doc = parseDocument(xml, { xmlMode: true });
  const urls = findAll((e) => e.name === "loc", doc.children).flatMap((e) => {
    try {
      const url = treeboUrl(textContent(e).trim(), city);
      return new URL(url).pathname.endsWith(`-${id}/`) ? [url] : [];
    } catch { return []; }
  });
  return [...new Set(urls)].length === 1 ? urls[0] ?? null : null;
}

export function parseTreeboHotel(html: string, url: string, city: City): TreeboHotel {
  const doc = parseDocument(html);
  const scripts = findAll((e) => e.name === "script" && getAttributeValue(e, "type") === "application/ld+json", doc.children);
  const objects: Record<string, unknown>[] = [];
  const walk = (v: unknown) => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (!v || typeof v !== "object") return;
    const o = v as Record<string, unknown>; objects.push(o); Object.values(o).forEach(walk);
  };
  for (const script of scripts) { try { walk(JSON.parse(textContent(script))); } catch { /* ignore unrelated invalid structured data */ } }
  const hotel = objects.find((o) => o["@type"] === "Hotel" || (Array.isArray(o["@type"]) && o["@type"].includes("Hotel")));
  if (!hotel || typeof hotel['name'] !== "string") throw new Error("Treebo hotel facts could not be parsed. Nothing was saved.");
  const address = hotel['address'] as Record<string, unknown> | undefined;
  const agg = hotel['aggregateRating'] as Record<string, unknown> | undefined;
  const state = assignedJson(html, "__INITIAL_STATE__") as { hotel?: { byId?: Record<string, { id: number; name: string; address?: { locality?: string }; amenities?: { name: string }[]; policies?: { type: string; description: string }[] }> } } | null;
  const id = new URL(url).pathname.match(/-(\d+)\/$/)?.[1];
  const record = id ? state?.hotel?.byId?.[id] : null;
  if (!record || !hotelNamesMatch(record.name, hotel['name'])) throw new Error("Treebo did not provide the complete hotel record. Nothing was saved.");
  const amenities = (record.amenities ?? []).map((a) => a.name).filter((a) => typeof a === "string" && a.length > 0);
  const locality = record.address?.locality ?? (typeof address?.['addressLocality'] === "string" ? address['addressLocality'] : "");
  const rating = Number(agg?.['ratingValue']), reviewCount = Number(agg?.['reviewCount'] ?? agg?.['ratingCount']);
  if (!locality || !amenities.length || !Number.isFinite(rating) || !Number.isFinite(reviewCount)) throw new Error("Treebo returned incomplete facts. Nothing was saved.");
  const offers = hotel['offers'] as Record<string, unknown> | undefined;
  const price = offers?.['priceCurrency'] === "INR" ? Number(offers['price']) : NaN;
  const img = Array.isArray(hotel['image']) ? hotel['image'][0] : hotel['image'];
  return { id: `treebo-${city.toLowerCase()}-${id}`, name: hotel['name'], city, locality, pricePerNight: Number.isFinite(price) ? price : null, rating, reviewCount, coupleFriendly: (record.policies ?? []).some((p) => p.type === "is_couple_friendly" && /welcomes unmarried couples|couples.*allowed/i.test(p.description)), amenities: [...new Set(amenities)], image: typeof img === "string" && img.startsWith("https://") ? img : null, url: treeboUrl(url, city) };
}