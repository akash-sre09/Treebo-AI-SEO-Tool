CREATE TABLE public.verified_hotels (
 id text PRIMARY KEY,
 name text NOT NULL,
 city text NOT NULL CHECK (city IN ('Bangalore','Pune')),
 locality text NOT NULL DEFAULT '',
 "pricePerNight" numeric,
 rating numeric NOT NULL DEFAULT 0,
 "reviewCount" integer NOT NULL DEFAULT 0,
 "coupleFriendly" boolean NOT NULL DEFAULT false,
 amenities text[] NOT NULL DEFAULT '{}',
 image text,
 url text NOT NULL DEFAULT '',
 source text NOT NULL DEFAULT 'treebo.com' CHECK (source = 'treebo.com'),
 fetched_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 lookup_name text NOT NULL,
 found boolean NOT NULL DEFAULT true,
 UNIQUE (city, lookup_name)
);
GRANT SELECT ON public.verified_hotels TO anon, authenticated;
GRANT ALL ON public.verified_hotels TO service_role;
ALTER TABLE public.verified_hotels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read verified hotel reviews" ON public.verified_hotels FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.probe_results ADD COLUMN extraction jsonb;