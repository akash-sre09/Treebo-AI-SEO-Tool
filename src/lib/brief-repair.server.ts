import { LIMITS, trimToWord, type BriefContent } from "@/lib/briefcheck";
import { rewriteToFit } from "@/lib/ai/engines.server";

/** Repair over-length meta fields: one AI rewrite, re-check, then word-boundary trim. */
export async function repairLengths<T extends BriefContent>(key: string, b: T): Promise<{ brief: T; fixed: string[] }> {
  const out = { ...b };
  const fixed: string[] = [];
  for (const f of ["metaTitle", "metaDescription"] as const) {
    const max = LIMITS[f];
    if (out[f].length < max) continue;
    let v = out[f];
    try { v = await rewriteToFit(key, f === "metaTitle" ? "meta title" : "meta description", out[f], max); } catch (e) { console.error("rewrite failed", e); }
    if (!v || v.length >= max) v = trimToWord(v || out[f], max);
    out[f] = v;
    fixed.push(f);
  }
  return { brief: out, fixed };
}
