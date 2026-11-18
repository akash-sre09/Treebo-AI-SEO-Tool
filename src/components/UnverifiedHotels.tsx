import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ExternalLink, Loader2, X } from "lucide-react";
import { Button } from "./ui/button";
import type { City } from "@/data/seed";
import type { ProbeResult } from "@/lib/probe-data";
import { verifiedHotelsQuery } from "@/lib/verified-hotels";
import { verifyHotel, reviewHotel } from "@/lib/verified-hotels.functions";
import { normalizeHotelName } from "@/lib/factcheck";

export function UnverifiedHotels({ city, results }: { city: City; results: ProbeResult[] }) {
  const { data: hotels = [] } = useQuery(verifiedHotelsQuery(city));
  const check = useServerFn(verifyHotel), review = useServerFn(reviewHotel);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const names = [...new Map(results.flatMap((r) => r.wrong_facts.filter((f) => f.type === "unverified_treebo" || f.type === "unknown_hotel").map((f) => [normalizeHotelName(f.hotel), f.hotel] as const))).values()];
  async function act(name: string, job: () => Promise<unknown>) {
    setBusy(name); setErrors((e) => ({ ...e, [name]: "" }));
    try { await job(); await qc.invalidateQueries({ queryKey: ["verifiedHotels", city] }); await qc.invalidateQueries({ queryKey: ["probe", city] }); await qc.invalidateQueries({ queryKey: ["runs", city] }); }
    catch (e) { setErrors((old) => ({ ...old, [name]: e instanceof Error ? e.message : "Website check failed." })); }
    finally { setBusy(null); }
  }
  return <section className="my-6 rounded-2xl border bg-card p-5 shadow-card">
    <h2 className="mb-4 font-semibold text-primary">Unverified hotels · {city}</h2>
    {!names.length ? <p className="text-sm text-muted-foreground">No unverified Treebo hotels in the latest runs.</p> : <div className="space-y-3">{names.map((name) => {
      const h = hotels.find((v) => normalizeHotelName(v.lookup_name) === normalizeHotelName(name));
      return <article key={name} className="rounded-xl border border-primary/10 bg-secondary/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-medium">{name}</h3><Button variant="outline" size="sm" disabled={busy !== null} onClick={() => act(name, () => check({ data: { name, city } }))}>{busy === name ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}Check on treebo.com</Button></div>
        {errors[name] && <p role="alert" className="mt-2 text-sm text-destructive">{errors[name]}</p>}
        {h && <div className="mt-3 space-y-2 text-sm">
          {!h.found ? <p className="text-destructive">Not found on treebo.com · checked {new Date(h.fetched_at).toLocaleString()}</p> : <>
            <p><a href={h.url} target="_blank" rel="noreferrer" className="text-primary underline">{h.name}</a> · {h.locality} · {h.status}</p>
            <p>{h.pricePerNight == null ? "Price not listed" : `From ₹${h.pricePerNight}`} · Rating {h.rating} · {h.reviewCount} reviews · {h.coupleFriendly ? "Couple-friendly" : "Couple policy not confirmed"}</p>
            <p className="text-muted-foreground">{h.amenities.join(" · ")}</p>
            <p className="text-xs text-muted-foreground">treebo.com · {new Date(h.fetched_at).toLocaleString()}</p>
            <div className="flex gap-2"><Button size="sm" disabled={busy !== null || h.status === "approved"} onClick={() => act(name, () => review({ data: { id: h.id, status: "approved" } }))}><Check className="size-4" />Approve</Button><Button size="sm" variant="outline" disabled={busy !== null || h.status === "rejected"} onClick={() => act(name, () => review({ data: { id: h.id, status: "rejected" } }))}><X className="size-4" />Reject</Button></div>
          </>}
        </div>}
      </article>;
    })}</div>}
  </section>;
}