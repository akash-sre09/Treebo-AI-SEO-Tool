# Treebo AI Visibility Agent

**Travellers asking AI where to stay should be pointed to Treebo's real hotels.**

More travellers now ask ChatGPT or Gemini *"best budget hotel in Koramangala?"* instead of searching Google. If the AI doesn't mention Treebo, the booking is lost before it starts. If it mentions Treebo with the wrong price or area, that's worse.

This internal tool measures how AI assistants talk about Treebo, finds where Treebo is missing, and produces fact-checked SEO briefs and landing pages to close those gaps. It then tracks whether they worked.

> Built during a Treebo hackathon with [Lovable](https://lovable.dev). This repository is a snapshot of the Lovable project.

---

## How it works

The app follows one loop, shown as a 5-step stepper in the UI:

```
 Probe AI  →  Find opportunities  →  Write brief  →  Build landing page  →  Track results
 (measure)      (prioritise)           (plan)           (build)               (prove)
```

### 1. AI Probe: what does AI say about Treebo?
- A fixed set of real traveller questions per city (Bangalore, Pune), each tagged with an **area** and an **intent** (budget, family, couple, business, landmark, transit). For example: *"Hotel near Manyata Tech Park for a work trip"*.
- Each question is sent to **Gemini** and **GPT** as a normal chat prompt.
- A second AI call extracts the brands, hotels, areas, prices and amenities from each answer, using forced tool calling.
- Plain code (no AI) then scores and checks the answer:
  - **Mentioned?** Whether Treebo appears, and its rank among the brands mentioned.
  - **Competitors:** which brands the AI recommended instead.
  - **Fact-check** against verified treebo.com data:
    - 🔴 wrong price (more than 20% off), wrong area, wrong amenity, hallucinated hotel
    - 🟡 unverified Treebo hotel (not found in inventory)

The questions stay the same every run, so runs are comparable over time. Changes under ±10 points are flagged as normal AI variation.

### 2. Dashboard: the one-glance view
- Treebo mention rate, average rank, wrong facts found and prompts tested.
- Mention-rate trend for each AI engine.
- **Share of voice:** Treebo's share of all brand mentions, compared with budget brands only or with all brands.
- **Area visibility:** areas where AI recommends Treebo, and where it is invisible.
- **Wrong facts:** each mistake shown as "AI said X → actual Y", grouped and linked to the full answer.

### 3. Opportunities: which page to build next?
A suggested page is a page that **a competitor has** (e.g. `/hotels-in-koramangala`), **Treebo doesn't have**, in an area where **Treebo has hotels**. Each suggestion is ranked by:

| Signal | Points |
|---|---|
| Treebo hotels in the area | 2 each |
| Competitor brands with that page | 2 each |
| AI answers that missed Treebo for that area and intent | 3 each |

### 4. Briefs: the plan for the page
AI writes an SEO brief covering meta title and description, H1, H2 outline and 6 FAQs. The questions AI missed become the FAQs. The AI is given **only verified Treebo facts** for the brief. Code then checks the result:
- every hotel named exists
- every ₹ price matches the seed data
- internal links point to real Treebo pages
- title and description lengths fit Google's limits
- the schema includes Hotel and FAQPage

Over-length fields are auto-repaired.

### 5. Landing pages and tracking
- **AI writes only the marketing copy.** Hotel cards, prices, ratings, amenities, Book links and JSON-LD are all built in code from verified data, so a page can never contain an invented hotel or price.
- Code checks every page: all cards are real hotels, all Book links go to treebo.com, the JSON-LD parses, there is exactly one H1, and every FAQ is present.
- Pages can be previewed (Treebo or generic style, desktop or mobile) and exported as HTML.
- **Tracking:** mark a page as published (or simulate it for demos). The tool compares AI answers to the page's target questions before and after that date.

### Demo mode
**Demo · Bangalore** / **Demo · Pune** on the dashboard runs a 6-step guided walkthrough using saved data only, with no AI calls.

---

## Core rule: AI never supplies Treebo facts

| Comes from AI | Comes from verified data and code |
|---|---|
| Probe answers (what we measure) | Hotel names, areas, prices, ratings, amenities |
| Brief wording and page marketing copy | Hotel cards, Book links, JSON-LD |
| | Every pass/fail check |

- Treebo facts come only from [`src/data/seed.ts`](src/data/seed.ts) and approved rows in the `verified_hotels` table. Both are sourced from treebo.com.
- The seed covers **81 Bangalore and 53 Pune hotels**.
- Unknown hotel names the AI mentions can be checked against treebo.com from the app. Approved finds are then added to the inventory.
- All checks are pure functions with unit tests, so results are reproducible.

---

## Tech stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React 19, file-based routing, `createServerFn` server functions), TypeScript, Vite
- **UI:** Tailwind CSS 4, shadcn/ui (Radix), Recharts
- **Data:** Supabase (Postgres + Auth), SQL migrations in [`drizzle/migrations`](drizzle/migrations)
- **AI:** Vercel AI SDK through the Lovable AI Gateway (Gemini + GPT)
- **Tests:** Vitest + Testing Library

## Project structure

```
src/
  data/seed.ts               Verified Treebo hotels, competitor pages, probe questions
  lib/
    factcheck.ts             Fact-check rules (wrong price/area/amenity, hallucinated, unverified)
    briefcheck.ts            Brief checks
    landing.ts               Landing-page HTML, JSON-LD and page checks
    opportunities.ts         Opportunity finding and scoring
    probe-data.ts            Dashboard maths: share of voice, area visibility, run comparison, page tracking
    treebo-parser.ts         Parses treebo.com listing and hotel pages (no AI)
    *.functions.ts           Server functions: probe, brief, page, publish, hotel verification
    ai/engines.server.ts     AI prompts and models
  routes/
    login.tsx                Google sign-in (@treebo.com only)
    _authenticated/          Dashboard, Probe, Opportunities, Briefs, Pages
  test/                      Unit tests for all checks and calculations
drizzle/migrations/          Database schema
```

## Access and security

- Sign-in is **Google only, restricted to `@treebo.com` accounts**. A database trigger also enforces the domain.
- Every server function checks the session. The database can only be read with a Treebo session, and all writes happen in server functions.
- `.env` contains only the Supabase URL and the **publishable** key. Private keys (`SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`) are server-side environment variables and are not in this repo.

## Running locally

Requires Node.js (or Bun).

```sh
npm install
npm run dev      # start the app
npm test         # run unit tests
npm run lint
```

The app expects the Supabase project in `.env` and a `LOVABLE_API_KEY` for AI calls, both provided when it runs on Lovable. To run it elsewhere, use your own Supabase project (apply the migrations in `drizzle/migrations`). You will also need an AI provider configured in `src/lib/ai/engines.server.ts`.

## Limitations

- The probe calls the models **directly, without live web search**. Results reflect what models know, not necessarily what a user sees in ChatGPT or Gemini with browsing.
- AI answers vary run to run, so watch trends rather than single runs.
- Competitor pages in the seed are sample data until they are replaced with real ones (e.g. from competitor sitemaps).
- Hotel prices are a single day's snapshot from treebo.com, and real prices change daily.
- Page publishing is tracked manually, so the tool does not deploy pages to treebo.com.

## Finding behind this project

Treebo's city pages (e.g. `treebo.com/hotels-in-bangalore/`) load their hotel list with JavaScript. An AI crawler that doesn't run JavaScript (GPTBot, ClaudeBot, PerplexityBot) sees about **31 words and "Showing 0 matching results"**, with no hotel names or prices. Putting the listing in the server HTML is likely one of the highest-impact fixes for AI visibility. The landing pages this tool generates are built that way.
