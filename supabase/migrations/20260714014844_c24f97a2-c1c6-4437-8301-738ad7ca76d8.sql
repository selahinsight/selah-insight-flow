
-- Restrict is_admin() so anon cannot call it directly. Authenticated policies still evaluate it.
REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, service_role;

-- Replace permissive customers INSERT policy with explicit non-empty checks.
DROP POLICY IF EXISTS "Anyone can create a customer record" ON public.customers;
CREATE POLICY "Anyone can create a customer record"
  ON public.customers FOR INSERT TO anon, authenticated
  WITH CHECK (length(btrim(name)) > 0 AND length(btrim(email)) > 0);
