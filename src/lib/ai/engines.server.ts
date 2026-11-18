import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./gateway.server";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";
import type { Extraction } from "@/lib/factcheck";

const BASE = "https://ai.gateway.lovable.dev/v1";
export const ENGINES = { gemini: "google/gemini-3.8-flash", gpt: "openai/gpt-6-luna" } as const;
export type EngineKey = keyof typeof ENGINES;

function model(engine: EngineKey, key: string) {
  if (engine === "gemini") return { model: createLovableAiGatewayProvider(key, undefined, { baseURL: BASE })(ENGINES.gemini), providerOptions: undefined };
  const rf = createLovableAiGatewayRunIdFetch();
  const p = createOpenAI({ baseURL: BASE, apiKey: key, headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }, fetch: rf.fetch });
  return {
    model: p.responses(ENGINES.gpt),
    providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
  };
}

const ASSISTANT = "You are a helpful travel assistant like ChatGPT. Answer the traveller's hotel question for India naturally, recommending specific hotels by name with brand, area and approximate nightly price where you can. Be concise (under 220 words).";

export async function answer(engine: EngineKey, key: string, prompt: string) {
  const m = model(engine, key);
  const r = streamText({ model: m.model, providerOptions: m.providerOptions as never, maxRetries: 1, instructions: ASSISTANT, prompt });
  return await r.text;
}

const schema = z.object({
  brands: z.array(z.string()).describe("Hotel brands/chains in order of first mention, e.g. Treebo, OYO, FabHotels, Taj. Independent hotels: use the hotel name."),
  hotels: z.array(z.object({ name: z.string(), brand: z.string(), locality: z.string().nullable(), price: z.number().nullable(), amenities: z.array(z.string()).describe("Amenities explicitly claimed for this hotel; empty if none") })),
  sources: z.array(z.string()).describe("URLs or site names cited; empty if none"),
});

export async function extract(engine: EngineKey, key: string, text: string): Promise<Extraction> {
  const m = model(engine, key);
  const r = streamText({
    model: m.model, providerOptions: m.providerOptions as never, maxRetries: 1,
    tools: { record_extraction: tool({ description: "Record the structured data extracted from the answer.", inputSchema: schema }) },
    toolChoice: { type: "tool", toolName: "record_extraction" },
    instructions: "Extract structured data from the travel assistant answer by calling record_extraction. Only include what the text says. Prices as numbers in INR per night (use the lower bound of a range). Use null when not stated.",
    prompt: text,
  });
  const calls = await r.toolCalls;
  const parsed = schema.safeParse(calls[0]?.input);
  if (!parsed.success) { console.error("extract: no valid tool call", JSON.stringify(calls[0]?.input)?.slice(0, 300)); return { brands: [], hotels: [], sources: [] }; }
  return parsed.data;
}

const briefSchema = z.object({
  metaTitle: z.string().describe("Under 60 characters"),
  metaDescription: z.string().describe("Under 155 characters"),
  h1: z.string(),
  h2Outline: z.array(z.string()).describe("5 to 7 H2 headings"),
  introAngle: z.string(),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).describe("Exactly 6"),
  internalLinks: z.array(z.object({ anchor: z.string(), slug: z.string() })),
  targetKeywords: z.array(z.string()),
  schemaTypes: z.array(z.string()),
  hotelsMentioned: z.array(z.string()).describe("Exact names of every hotel mentioned anywhere in the brief"),
});
export type BriefOut = z.infer<typeof briefSchema>;

export async function writeBrief(key: string, prompt: string): Promise<BriefOut> {
  const m = model("gemini", key);
  const r = streamText({
    model: m.model, maxRetries: 1,
    tools: { record_brief: tool({ description: "Record the SEO content brief.", inputSchema: briefSchema }) },
    toolChoice: { type: "tool", toolName: "record_brief" },
    instructions: "You are an SEO strategist writing a landing-page content brief for Treebo Hotels. Call record_brief. Use ONLY the facts provided (hotel names, areas, prices, ratings). Never invent hotels, prices, amenities, distances or ratings. If a fact is not provided (e.g. a price is 'not listed'), do not mention it at all. Write prices exactly as given, like ₹1551.",
    prompt,
  });
  const calls = await r.toolCalls;
  const parsed = briefSchema.safeParse(calls[0]?.input);
  if (!parsed.success) throw new Error("The AI did not return a valid brief. Please try again.");
  return parsed.data;
}

/** One small call that rewrites a single SEO field to fit a hard length limit. */
export async function rewriteToFit(key: string, field: string, text: string, max: number): Promise<string> {
  const m = model("gemini", key);
  const r = streamText({
    model: m.model, maxRetries: 1,
    instructions: `Rewrite the given ${field} so it is at most ${max - 1} characters. Keep its meaning, keywords and any prices exactly; add no new facts. Reply with the rewritten text only, no quotes.`,
    prompt: text,
  });
  return (await r.text).trim().replace(/^["']|["']$/g, "");
}

const pageCopySchema = z.object({
  heroHeadline: z.string(),
  heroSubline: z.string(),
  intro: z.string().describe("150 to 200 words"),
  whyStay: z.array(z.object({ title: z.string(), text: z.string() })).describe("3 or 4 points"),
});
export type PageCopy = z.infer<typeof pageCopySchema>;

export async function writePageCopy(key: string, prompt: string): Promise<PageCopy> {
  const m = model("gemini", key);
  const r = streamText({
    model: m.model, maxRetries: 1,
    tools: { record_copy: tool({ description: "Record the landing page copy.", inputSchema: pageCopySchema }) },
    toolChoice: { type: "tool", toolName: "record_copy" },
    instructions: "You write landing-page copy for Treebo Hotels. Call record_copy. Write ONLY marketing copy about the area and staying with Treebo. Do not name individual hotels, do not state prices, ratings, amenities or distances — those are rendered separately from verified data. Intro must be 150–200 words.",
    prompt,
  });
  const calls = await r.toolCalls;
  const parsed = pageCopySchema.safeParse(calls[0]?.input);
  if (!parsed.success) throw new Error("The AI did not return valid page copy. Please try again.");
  return parsed.data;
}
