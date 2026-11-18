import { useSyncExternalStore } from "react";
import type { City } from "@/data/seed";

/** Demo walk-through state (module-level; survives client navigation). step null = off. */
let state: { step: number | null; city: City } = { step: null, city: "Bangalore" };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
export const setDemoStep = (s: number | null) => { state = { ...state, step: s }; emit(); };
export const startDemo = (city: City) => { state = { step: 0, city }; emit(); };
const sub = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const useDemoStep = () => useSyncExternalStore(sub, () => state.step, () => null);
export const useDemoCity = () => useSyncExternalStore(sub, () => state.city, () => "Bangalore" as City);
export const DEMO_STEPS = ["Dashboard", "Top opportunity", "Its missed AI answers", "Latest brief", "Latest landing page", "Published tracking"] as const;
