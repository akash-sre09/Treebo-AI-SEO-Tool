CREATE OR REPLACE FUNCTION public.enforce_treebo_auth_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email IS NULL OR lower(trim(NEW.email)) NOT LIKE '%@treebo.com' THEN
    RAISE EXCEPTION 'Unauthorized: only @treebo.com accounts are allowed';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_treebo_auth_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_treebo_auth_email ON auth.users;
CREATE TRIGGER enforce_treebo_auth_email
BEFORE INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.enforce_treebo_auth_email();

DO $$
DECLARE
  app_table text;
BEGIN
  FOREACH app_table IN ARRAY ARRAY[
    'audit_pages', 'audit_runs', 'briefs', 'check_results',
    'pages', 'probe_results', 'probe_runs', 'verified_hotels'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', app_table);
    EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', app_table);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', app_table);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', app_table);
    EXECUTE format(
      'CREATE POLICY "Treebo users can read %s" ON public.%I FOR SELECT TO authenticated USING (lower(coalesce(auth.jwt() ->> ''email'', '''')) LIKE ''%%@treebo.com'')',
      app_table, app_table
    );
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Public read audit pages" ON public.audit_pages;
DROP POLICY IF EXISTS "Public read audits" ON public.audit_runs;
DROP POLICY IF EXISTS "public read" ON public.briefs;
DROP POLICY IF EXISTS "Public read audit checks" ON public.check_results;
DROP POLICY IF EXISTS "public read" ON public.pages;
DROP POLICY IF EXISTS "public read" ON public.probe_results;
DROP POLICY IF EXISTS "public read" ON public.probe_runs;
DROP POLICY IF EXISTS "Public read verified hotel reviews" ON public.verified_hotels;

REVOKE ALL ON FUNCTION public.start_page_audit(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_page_audit(uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_page_audit(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_page_audit(uuid, jsonb, jsonb) TO service_role;