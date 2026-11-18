import { describe, expect, it } from "vitest";
import { assignedJson, listingHotels, parseTreeboHotel, sitemapHotelUrl } from "@/lib/treebo-parser";

describe("website-only hotel parsing", () => {
  it("reads full amenities from hotel state, not the shortened JSON-LD list", () => {
    const state = { hotel: { byId: { "123": { id: 123, name: "Treebo Test", address: { locality: "Koramangala" }, amenities: [{ name: "Free Wifi" }, { name: "Parking" }, { name: "Gym" }], policies: [{ type: "is_couple_friendly", description: "Treebo Test welcomes unmarried couples." }] } } } };
    const ld = { "@type": "Hotel", name: "Treebo Test", aggregateRating: { ratingValue: 4.2, reviewCount: 123 }, amenityFeature: [{ name: "Parking", value: true }], priceRange: "₹1,200 - ₹3,500", image: ["https://example.com/photo.jpg"] };
    const html = `<script>window.__INITIAL_STATE__ = ${JSON.stringify(state)};</script><script type="application/ld+json">${JSON.stringify(ld)}</script>`;
    expect(parseTreeboHotel(html, "https://www.treebo.com/hotels-in-bangalore/test-123/", "Bangalore")).toMatchObject({ locality: "Koramangala", amenities: ["Free Wifi", "Parking", "Gym"], rating: 4.2, reviewCount: 123, pricePerNight: null, coupleFriendly: true });
  });
  it("blocked and empty listings cannot confirm a missing hotel", () => {
    expect(() => listingHotels("<h1>403 Forbidden</h1>", "Pune")).toThrow();
    expect(() => listingHotels("<h1>Showing 0 matching results</h1>", "Pune")).toThrow();
  });
  it("finds listing names from Apollo data and resolves only published sitemap URLs", () => {
    const html = '<script>window.__APOLLO_STATE__={"HotelSearchItem:123":{"__typename":"HotelSearchItem","id":"123","name":"Treebo Test"}};</script>';
    expect(listingHotels(html, "Pune")).toEqual([{ id: "123", name: "Treebo Test", url: null }]);
    expect(sitemapHotelUrl('<urlset><url><loc>https://www.treebo.com/hotels-in-pune/test-hinjewadi-123/</loc></url></urlset>', "123", "Pune")).toBe("https://www.treebo.com/hotels-in-pune/test-hinjewadi-123/");
    expect(sitemapHotelUrl('<urlset><url><loc>https://evil.example/hotels-in-pune/test-123/</loc></url></urlset>', "123", "Pune")).toBeNull();
  });
  it("handles braces inside JSON strings without executing scripts", () => {
    expect(assignedJson('window.__INITIAL_STATE__={"name":"A } { \\" quote"};window.bad();', "__INITIAL_STATE__")).toEqual({ name: 'A } { " quote' });
  });
});