
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.create_customer_contact(
  p_name text DEFAULT NULL::text,
  p_nickname text DEFAULT NULL::text
)
RETURNS TABLE(id text, contact_token uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_name TEXT := NULLIF(btrim(coalesce(p_name, '')), '');
  v_nick TEXT := NULLIF(btrim(coalesce(p_nickname, '')), '');
  v_id TEXT;
  v_token UUID;
BEGIN
  IF v_name IS NULL AND v_nick IS NULL THEN
    RAISE EXCEPTION 'name or nickname is required';
  END IF;

  v_id := 'cu_' || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.customers (id, name, nickname)
  VALUES (v_id, v_name, v_nick)
  RETURNING customers.id, customers.contact_token INTO v_id, v_token;

  RETURN QUERY SELECT v_id, v_token;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_customer_contact(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_customer_contact(text, text) TO anon, authenticated;
