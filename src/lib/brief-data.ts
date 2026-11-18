import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BriefCheck, BriefContent } from "@/lib/briefcheck";

export interface BriefRow { id: string; city: string; slug: string; created_at: string; brief: BriefContent & { area: string; intent: string | null; missed: string[]; checks: BriefCheck[]; autoFixed?: string[] } }

export const briefsListQuery = () => queryOptions({
  queryKey: ["briefs"],
  queryFn: async () => {
    const { data, error } = await supabase.from("briefs").select("id, city, slug, created_at").order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data ?? [];
  },
});

export const briefQuery = (id: string) => queryOptions({
  queryKey: ["brief", id],
  queryFn: async () => {
    const { data, error } = await supabase.from("briefs").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as unknown as BriefRow | null;
  },
});

export const fmtDate = (s: string) => new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const pagesListQuery = () => queryOptions({
  queryKey: ["pages"],
  queryFn: async () => {
    const { data, error } = await supabase.from("pages").select("id, city, slug, brief_id, created_at, published_at, publish_simulated").order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data ?? [];
  },
});

export const pageQuery = (id: string) => queryOptions({
  queryKey: ["page", id],
  queryFn: async () => {
    const { data, error } = await supabase.from("pages").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  },
});
