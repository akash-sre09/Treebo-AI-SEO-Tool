import { treeboHotels, type City, type TreeboHotel } from "@/data/seed";
import type { BriefContent } from "@/lib/briefcheck";

export interface PageCopy { heroHeadline: string; heroSubline: string; intro: string; whyStay: { title: string; text: string }[] }
export interface PageCheck { id: string; label: string; pass: boolean; detail: string }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const RED = "#E63946";

/** Builds the standalone landing page. AI supplies only `copy`; every fact comes from the seed. */
export type PageStyle = "treebo" | "generic";

export function buildLandingHtml(opts: { city: City; area: string; slug: string; brief: BriefContent; copy: PageCopy; style?: PageStyle }): string {
  if ((opts.style ?? "treebo") === "treebo") return buildTreeboHtml(opts);
  const { city, area, slug, brief, copy } = opts;
  const hotels = treeboHotels.filter((h) => h.city === city && h.locality === area);
  const canonical = `https://www.treebo.com${slug.startsWith("/") ? slug : `/${slug}`}`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "ItemList", name: brief.h1, itemListElement: hotels.map((h, i) => ({
        "@type": "ListItem", position: i + 1,
        item: { "@type": "Hotel", name: h.name, url: h.url, address: { "@type": "PostalAddress", addressLocality: h.locality, addressRegion: city, addressCountry: "IN" },
          aggregateRating: { "@type": "AggregateRating", ratingValue: h.rating, reviewCount: h.reviewCount, bestRating: 5 },
          amenityFeature: h.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })),
          ...(h.pricePerNight != null ? { priceRange: `From ₹${h.pricePerNight}` } : {}) },
      })) },
      { "@type": "FAQPage", mainEntity: brief.faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) },
    ],
  };
  const card = (h: TreeboHotel) => `
      <article class="card" data-hotel-id="${h.id}">
        <h3>${esc(h.name)}</h3>
        <p class="area">${esc(h.locality)}, ${city}</p>
        <p class="meta"><span class="rating">★ ${h.rating.toFixed(1)}</span> <span class="muted">(${h.reviewCount} reviews)</span></p>
        ${h.pricePerNight != null ? `<p class="price">from <strong>₹${h.pricePerNight.toLocaleString("en-IN")}</strong> <span class="muted">/ night</span></p>` : ""}
        <ul class="amen">${h.amenities.slice(0, 3).map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
        <a class="btn" href="${esc(h.url)}" target="_blank" rel="noopener">Book on Treebo</a>
      </article>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(brief.metaTitle)}</title>
<meta name="description" content="${esc(brief.metaDescription)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(brief.metaTitle)}">
<meta property="og:description" content="${esc(brief.metaDescription)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1d1d1f;background:#fafafa;line-height:1.55}
a{color:${RED}}.wrap{max-width:1080px;margin:0 auto;padding:0 18px}
header.top{background:#fff;border-bottom:1px solid #eee}header.top .wrap{display:flex;align-items:center;height:56px;font-weight:700;color:${RED};letter-spacing:.02em}
.hero{background:${RED};color:#fff;padding:40px 0 44px}.hero h1{font-size:1.8rem;line-height:1.2;margin:0 0 10px}.hero .eyebrow{font-weight:600;text-transform:uppercase;letter-spacing:.06em;font-size:.8rem;margin:0 0 8px}.hero p{margin:0;font-size:1.05rem;opacity:.95;max-width:640px}
section{padding:32px 0}h2{font-size:1.35rem;margin:0 0 16px}
.intro p{max-width:760px;margin:0;font-size:1.02rem}
.grid{display:grid;gap:16px;grid-template-columns:1fr}
.card{background:#fff;border:1px solid #eee;border-radius:14px;padding:18px;display:flex;flex-direction:column}
.card h3{margin:0 0 4px;font-size:1.05rem;line-height:1.3}.area{margin:0 0 8px;color:#666;font-size:.9rem}.meta,.price{margin:0 0 6px;font-size:.95rem}
.rating{color:#1d7a46;font-weight:600}.muted{color:#888;font-size:.85rem}.price strong{font-size:1.15rem}
.amen{list-style:none;padding:0;margin:6px 0 14px;display:flex;flex-wrap:wrap;gap:6px}.amen li{background:#f3f3f3;border-radius:999px;padding:3px 10px;font-size:.8rem}
.btn{margin-top:auto;display:block;text-align:center;background:${RED};color:#fff;text-decoration:none;font-weight:600;border-radius:10px;padding:11px 14px}
.why{display:grid;gap:14px;grid-template-columns:1fr}.why div{background:#fff;border-left:4px solid ${RED};border-radius:10px;padding:14px 16px}.why h3{margin:0 0 4px;font-size:1rem}.why p{margin:0;color:#444;font-size:.95rem}
details{background:#fff;border:1px solid #eee;border-radius:10px;margin-bottom:10px}summary{cursor:pointer;padding:14px 16px;font-weight:600;list-style:none}summary::-webkit-details-marker{display:none}summary:after{content:"+";float:right;color:${RED}}details[open] summary:after{content:"–"}details p{margin:0;padding:0 16px 14px;color:#444}
.links{display:flex;flex-wrap:wrap;gap:8px;padding:0;list-style:none}.links a{display:inline-block;border:1px solid ${RED};border-radius:999px;padding:6px 14px;text-decoration:none}
footer{padding:24px 0 40px;color:#888;font-size:.85rem}
@media (min-width:640px){.grid{grid-template-columns:repeat(2,1fr)}.why{grid-template-columns:repeat(2,1fr)}.hero h1{font-size:2.3rem}}
@media (min-width:960px){.grid{grid-template-columns:repeat(3,1fr)}.hero{padding:64px 0}}
</style>
</head>
<body>
<header class="top"><div class="wrap">treebo</div></header>
<div class="hero"><div class="wrap">
  ${copy.heroHeadline.trim().toLowerCase() !== brief.h1.trim().toLowerCase() ? `<p class="eyebrow">${esc(copy.heroHeadline)}</p>` : ""}
  <h1>${esc(brief.h1)}</h1>
  <p>${esc(copy.heroSubline)}</p>
</div></div>
<main class="wrap">
  <section class="intro"><p>${esc(copy.intro)}</p></section>
  <section><h2>Treebo hotels in ${esc(area)}</h2><div class="grid">${hotels.map(card).join("")}
  </div></section>
  <section><h2>Why stay in ${esc(area)}</h2><div class="why">${copy.whyStay.map((w) => `<div><h3>${esc(w.title)}</h3><p>${esc(w.text)}</p></div>`).join("")}</div></section>
  <section><h2>Frequently asked questions</h2>${brief.faqs.map((f) => `<details><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`).join("")}</section>
  ${brief.internalLinks.length ? `<section><h2>Explore more</h2><ul class="links">${brief.internalLinks.map((l) => `<li><a href="https://www.treebo.com${esc(l.slug)}">${esc(l.anchor)}</a></li>`).join("")}</ul></section>` : ""}
</main>
<footer><div class="wrap">Prices and ratings from treebo.com, verified ${new Date().toISOString().slice(0, 10)}. Prices change daily.</div></footer>
</body>
</html>`;
}

const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260"><rect width="400" height="260" fill="#e0e0e0"/><path d="M170 150l30-35 25 28 15-17 30 39H130z" fill="#bdbdbd"/></svg>');
const TREEBO_LOGO = "https://images.treebohotels.com/images/hotrod/treebo-club-logo-black.svg";
const cityPage = (c: City) => `https://www.treebo.com/hotels-in-${c.toLowerCase()}/`;

function jsonLd(city: City, brief: BriefContent, hotels: TreeboHotel[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "ItemList", name: brief.h1, itemListElement: hotels.map((h, i) => ({
        "@type": "ListItem", position: i + 1,
        item: { "@type": "Hotel", name: h.name, url: h.url, ...(h.image ? { image: h.image } : {}),
          address: { "@type": "PostalAddress", addressLocality: h.locality, addressRegion: city, addressCountry: "IN" },
          aggregateRating: { "@type": "AggregateRating", ratingValue: h.rating, reviewCount: h.reviewCount, bestRating: 5 },
          amenityFeature: h.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })),
          ...(h.pricePerNight != null ? { priceRange: `From ₹${h.pricePerNight}` } : {}) },
      })) },
      { "@type": "FAQPage", mainEntity: brief.faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) },
    ],
  };
}

/** treebo.com look: white nav with logo + search strip, horizontal cards, green rating badge, teal CTA. */
function buildTreeboHtml(opts: { city: City; area: string; slug: string; brief: BriefContent; copy: PageCopy }): string {
  const { city, area, slug, brief, copy } = opts;
  const hotels = treeboHotels.filter((h) => h.city === city && h.locality === area);
  const canonical = `https://www.treebo.com${slug.startsWith("/") ? slug : `/${slug}`}`;
  const prices = hotels.map((h) => h.pricePerNight).filter((p): p is number => p != null);
  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const card = (h: TreeboHotel) => `
    <article class="hc" data-hotel-id="${h.id}">
      <a class="hc-img" href="${esc(h.url)}" target="_blank" rel="noopener"><img src="${esc(h.image ?? PLACEHOLDER)}" alt="${esc(h.name)}" loading="lazy" width="270" height="190"></a>
      <div class="hc-body">
        <h3 class="hc-name">${esc(h.name)}</h3>
        <p class="hc-area">${esc(h.locality)}</p>
        <p class="hc-rate"><span class="badge">${h.rating.toFixed(1)} ★</span><span class="hc-count">${h.reviewCount} Ratings</span></p>
        <ul class="hc-amen">${h.amenities.slice(0, 3).map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
      </div>
      <div class="hc-side">
        ${h.pricePerNight != null ? `<div class="hc-price">${inr(h.pricePerNight)}</div><div class="hc-tax">Incl. tax for 1 night</div>` : `<div class="hc-tax">See prices on Treebo</div>`}
        <a class="btn" href="${esc(h.url)}" target="_blank" rel="noopener">Book on Treebo</a>
      </div>
    </article>`;
  const links = [...brief.internalLinks.map((l) => ({ href: `https://www.treebo.com${l.slug}`, text: l.anchor })), { href: cityPage(city), text: `All hotels in ${city}` }];
  const uniq = links.filter((l, i) => links.findIndex((x) => x.href === l.href) === i);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(brief.metaTitle)}</title>
<meta name="description" content="${esc(brief.metaDescription)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(brief.metaTitle)}">
<meta property="og:description" content="${esc(brief.metaDescription)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
${hotels[0]?.image ? `<meta property="og:image" content="${esc(hotels[0].image)}">` : ""}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(jsonLd(city, brief, hotels)).replace(/</g, "\\u003c")}</script>
<style>
*{box-sizing:border-box}body{margin:0;font-family:Poppins,system-ui,-apple-system,"Segoe UI",sans-serif;color:#4a4a4a;background:#f1f1f1;font-size:14px;line-height:1.55}
a{color:#008271;text-decoration:none}h1,h2,h3{color:#21201e;font-weight:500;margin:0}
.wrap{max-width:1200px;margin:0 auto;padding:0 16px}
.nav{background:#fff;box-shadow:0 1px 0 #e0e0e0;position:sticky;top:0;z-index:5}
.nav .wrap{display:flex;align-items:center;gap:20px;height:64px}.nav img{height:32px;width:auto;display:block}
.nav ul{display:none;list-style:none;margin:0 0 0 auto;padding:0;gap:22px}.nav ul a{color:#4a4a4a;font-size:13px}.nav ul a:hover{color:#008271}
.search{background:#fff;padding:12px 0 14px}.search .bar{display:flex;align-items:stretch;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden;background:#fff}
.search .f{flex:1;padding:10px 14px;font-size:13px;color:#21201e;border-right:1px solid #e0e0e0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.search .f small{display:block;color:#9b9b9b;font-size:11px}
.search .f.d{display:none}.search .go{background:#008271;color:#fff;display:flex;align-items:center;justify-content:center;padding:0 18px;font-weight:500}
.crumb{font-size:12px;color:#737373;padding:14px 0 6px}.crumb a{color:#008271}
.head h1{font-size:22px;line-height:1.3}.head p{margin:4px 0 0;color:#737373;font-size:12px}
.box{background:#fff;border-radius:12px;padding:18px;margin:14px 0}
.list{display:flex;flex-direction:column;gap:14px;margin:14px 0}
.hc{background:#fff;border-radius:12px;padding:14px;display:grid;grid-template-columns:1fr;gap:12px}
.hc-img img{width:100%;height:190px;object-fit:cover;border-radius:8px;display:block;background:#e0e0e0}
.hc-name{font-size:17px;line-height:1.35}.hc-area{margin:2px 0 8px;color:#737373;font-size:13px}
.hc-rate{display:flex;align-items:center;gap:8px;margin:0 0 10px}.badge{background:#008271;color:#fff;font-weight:600;font-size:12px;padding:3px 8px;border-radius:12px}.hc-count{color:#9b9b9b;font-size:12px}
.hc-amen{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:6px}.hc-amen li{border:1px solid #e0e0e0;border-radius:6px;padding:2px 8px;font-size:12px;color:#4a4a4a}
.hc-side{display:flex;flex-direction:column;align-items:flex-start;gap:2px;border-top:1px solid #f1f1f1;padding-top:10px}
.hc-price{color:#21201e;font-weight:600;font-size:22px;line-height:1.2}.hc-tax{color:#737373;font-size:12px;margin-bottom:10px}
.btn{display:block;width:100%;text-align:center;background:#0e6b61;color:#fff;font-weight:500;font-size:13px;letter-spacing:.04em;text-transform:uppercase;border-radius:4px;padding:10px 18px}.btn:hover{background:#008271}
h2{font-size:18px;margin:0 0 12px}
.why{display:grid;gap:12px;grid-template-columns:1fr}.why div{border:1px solid #e0e0e0;border-radius:10px;padding:14px}.why h3{font-size:14px;margin-bottom:4px;color:#008271}.why p{margin:0}
details{border-bottom:1px solid #e0e0e0}details:last-child{border-bottom:0}summary{cursor:pointer;padding:14px 28px 14px 0;color:#21201e;font-weight:500;list-style:none;position:relative}summary::-webkit-details-marker{display:none}
summary:after{content:"";position:absolute;right:6px;top:20px;width:8px;height:8px;border-right:2px solid #008271;border-bottom:2px solid #008271;transform:rotate(45deg)}details[open] summary:after{transform:rotate(-135deg);top:24px}details p{margin:0 0 14px}
.chips{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:0}.chips a{display:inline-block;border:1px solid #008271;border-radius:20px;padding:6px 14px;font-size:13px}
footer{background:#fff;margin-top:24px;padding:28px 0 18px;border-top:1px solid #e0e0e0;font-size:13px}
.fcols{display:grid;grid-template-columns:1fr 1fr;gap:20px}.fcols h4{margin:0 0 8px;color:#21201e;font-weight:500;font-size:13px}.fcols ul{list-style:none;padding:0;margin:0}.fcols li{margin-bottom:6px}.fcols a{color:#4a4a4a}
.fnote{margin-top:20px;padding-top:14px;border-top:1px solid #f1f1f1;color:#9b9b9b;font-size:12px}
@media (min-width:760px){
 .nav ul{display:flex}.search .f.d{display:block}.head h1{font-size:26px}
 .hc{grid-template-columns:270px 1fr 190px;gap:18px}.hc-img img{height:100%;min-height:180px}
 .hc-side{border-top:0;padding-top:0;align-items:flex-end;text-align:right;justify-content:flex-start}.hc-side .btn{margin-top:auto;width:auto}
 .why{grid-template-columns:repeat(2,1fr)}.fcols{grid-template-columns:repeat(4,1fr)}
}
</style>
</head>
<body>
<header class="nav"><div class="wrap">
  <a href="https://www.treebo.com/"><img src="${TREEBO_LOGO}" alt="Treebo" width="126" height="40"></a>
  <ul><li><a href="${cityPage(city)}">Hotels in ${city}</a></li><li><a href="https://www.treebo.com/blog/">Travel Blog</a></li><li><a href="https://www.treebo.com/blog/treebo-coupons-and-offers/">Coupons &amp; Offers</a></li></ul>
</div></header>
<div class="search"><div class="wrap"><a class="bar" href="${cityPage(city)}">
  <span class="f"><small>Where</small>${esc(area)}, ${city}</span>
  <span class="f d"><small>Dates</small>Select dates</span>
  <span class="f d"><small>Guests</small>1 Room, 1 Adult</span>
  <span class="go">Search</span>
</a></div></div>
<main class="wrap">
  <nav class="crumb"><a href="https://www.treebo.com/">Home</a> › <a href="${cityPage(city)}">Hotels in ${city}</a> › ${esc(area)}</nav>
  <div class="head">
    <h1>${esc(brief.h1)}</h1>
    <p>${hotels.length} Treebo hotel${hotels.length === 1 ? "" : "s"} in ${esc(area)}${prices.length ? ` with prices starting from ${inr(Math.min(...prices))}` : ""}</p>
  </div>
  <section class="box"><h2>${esc(copy.heroHeadline && copy.heroHeadline.trim().toLowerCase() !== brief.h1.trim().toLowerCase() ? copy.heroHeadline : `Staying in ${area}`)}</h2><p style="margin:0 0 10px;color:#21201e">${esc(copy.heroSubline)}</p><p style="margin:0">${esc(copy.intro)}</p></section>
  <section class="list" aria-label="Treebo hotels in ${esc(area)}">${hotels.map(card).join("")}
  </section>
  <section class="box"><h2>Why stay in ${esc(area)}</h2><div class="why">${copy.whyStay.map((w) => `<div><h3>${esc(w.title)}</h3><p>${esc(w.text)}</p></div>`).join("")}</div></section>
  <section class="box"><h2>Frequently asked questions</h2>${brief.faqs.map((f) => `<details><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`).join("")}</section>
  <section class="box"><h2>Explore more</h2><ul class="chips">${uniq.map((l) => `<li><a href="${esc(l.href)}">${esc(l.text)}</a></li>`).join("")}</ul></section>
</main>
<footer><div class="wrap">
  <div class="fcols">
    <div><h4>Explore</h4><ul>${uniq.map((l) => `<li><a href="${esc(l.href)}">${esc(l.text)}</a></li>`).join("")}</ul></div>
    <div><h4>Company</h4><ul><li><a href="https://www.treebo.com/aboutus/">About</a></li><li><a href="https://careers.treebo.com/">Careers</a></li></ul></div>
    <div><h4>Offers</h4><ul><li><a href="https://www.treebo.com/blog/">Travel Blog</a></li><li><a href="https://www.treebo.com/blog/treebo-coupons-and-offers/">Treebo Coupons &amp; Offers</a></li></ul></div>
    <div><h4>Policies</h4><ul><li><a href="https://www.treebo.com/terms/">Terms of Service</a></li><li><a href="https://www.treebo.com/policy/">Privacy Policy</a></li></ul></div>
  </div>
  <div class="fnote">Prices, ratings and amenities from treebo.com, verified ${new Date().toISOString().slice(0, 10)}. Prices change daily.</div>
</div></footer>
</body>
</html>`;
}

/** Code checks on generated HTML. Regex-based so it runs anywhere (no DOM needed). */
export function checkPage(html: string, brief: BriefContent, city: City): PageCheck[] {
  const ids = [...html.matchAll(/data-hotel-id="([^"]+)"/g)].map((m) => m[1]!);
  const unknown = ids.filter((id) => !treeboHotels.some((h) => h.id === id && h.city === city));
  const books = [...html.matchAll(/<a class="btn" href="([^"]+)"/g)].map((m) => m[1]!.replace(/&amp;/g, "&"));
  const badBooks = books.filter((u) => { try { return !/(^|\.)treebo\.com$/.test(new URL(u).hostname); } catch { return true; } });
  let ldOk = false; let ldDetail = "Missing";
  const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  if (ld) {
    try {
      const j = JSON.parse(ld) as { "@graph"?: { "@type": string }[] };
      const types = (j["@graph"] ?? []).map((g) => g["@type"]);
      ldOk = types.includes("ItemList") && types.includes("FAQPage");
      ldDetail = types.join(" + ");
    } catch (e) { ldDetail = `Parse error: ${(e as Error).message}`; }
  }
  const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
  const unesc = (s: string) => s.replace(/&quot;/g, '"').replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&");
  const summaries = [...html.matchAll(/<summary>([\s\S]*?)<\/summary>/g)].map((m) => unesc(m[1]!));
  const missingFaq = brief.faqs.filter((f) => !summaries.includes(f.question));
  return [
    { id: "hotels", label: "Every hotel card is a seed hotel", pass: ids.length > 0 && unknown.length === 0, detail: unknown.length ? `Unknown ids: ${unknown.join(", ")}` : `${ids.length} cards verified` },
    { id: "book", label: "Every Book link is treebo.com", pass: books.length === ids.length && badBooks.length === 0, detail: badBooks.length ? `Bad: ${badBooks.join(", ")}` : `${books.length} links OK` },
    { id: "jsonld", label: "JSON-LD parses", pass: ldOk, detail: ldDetail },
    { id: "h1", label: "Exactly 1 H1", pass: h1 === 1, detail: `${h1} found` },
    { id: "faqs", label: "Every brief FAQ present", pass: missingFaq.length === 0, detail: missingFaq.length ? `Missing ${missingFaq.length}` : `${brief.faqs.length}/${brief.faqs.length}` },
  ];
}
