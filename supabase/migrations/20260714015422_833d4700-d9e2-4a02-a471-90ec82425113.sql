
-- =========================================================
-- 1) customers table adjustments
-- =========================================================

-- Add new columns
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contact_token UUID NOT NULL DEFAULT gen_random_uuid();

-- name becomes optional (nickname OR name must be present via CHECK below)
ALTER TABLE public.customers ALTER COLUMN name DROP NOT NULL;

-- email becomes optional; drop the strict UNIQUE and replace with a partial unique index
ALTER TABLE public.customers ALTER COLUMN email DROP NOT NULL;

-- Drop existing unique constraint on email if present
DO $$
DECLARE
  cons_name TEXT;
BEGIN
  SELECT conname INTO cons_name
  FROM pg_constraint
  WHERE conrelid = 'public.customers'::regclass
    AND contype = 'u'
    AND conkey = ARRAY[
      (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.customers'::regclass AND attname = 'email')
    ];
  IF cons_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.customers DROP CONSTRAINT %I', cons_name);
  END IF;
END $$;

-- Partial unique: only enforce when email is provided (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique
  ON public.customers (lower(email))
  WHERE email IS NOT NULL;

-- Require at least one of name / nickname
ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_identity_required;
ALTER TABLE public.customers
  ADD CONSTRAINT customers_identity_required
  CHECK (
    (name IS NOT NULL AND length(btrim(name)) > 0)
    OR (nickname IS NOT NULL AND length(btrim(nickname)) > 0)
  );

-- =========================================================
-- 2) Tighten customers RLS: no direct anon INSERT/UPDATE.
--    Contact token flow goes through SECURITY DEFINER RPCs.
-- =========================================================

DROP POLICY IF EXISTS "Anyone can create a customer record" ON public.customers;

-- Remove anon INSERT grant — RPCs handle creation.
REVOKE INSERT ON public.customers FROM anon;

-- (SELECT/UPDATE/DELETE for admins already exist from previous migration.)

-- =========================================================
-- 3) RPC: create_customer_contact
--    Creates a customer with name and/or nickname. Returns id + contact_token.
-- =========================================================
CREATE OR REPLACE FUNCTION public.create_customer_contact(
  p_name TEXT DEFAULT NULL,
  p_nickname TEXT DEFAULT NULL
)
RETURNS TABLE (id UUID, contact_token UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT := NULLIF(btrim(coalesce(p_name, '')), '');
  v_nick TEXT := NULLIF(btrim(coalesce(p_nickname, '')), '');
  v_id UUID;
  v_token UUID;
BEGIN
  IF v_name IS NULL AND v_nick IS NULL THEN
    RAISE EXCEPTION 'name or nickname is required';
  END IF;

  INSERT INTO public.customers (name, nickname)
  VALUES (v_name, v_nick)
  RETURNING customers.id, customers.contact_token INTO v_id, v_token;

  RETURN QUERY SELECT v_id, v_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_customer_contact(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_customer_contact(TEXT, TEXT) TO anon, authenticated, service_role;

-- =========================================================
-- 4) RPC: update_customer_contact
--    Updates email + consent fields ONLY when the caller supplies the row's
--    contact_token. Refuses if privacy_consent is false.
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_customer_contact(
  p_customer_id UUID,
  p_contact_token UUID,
  p_email TEXT,
  p_marketing_consent BOOLEAN DEFAULT false,
  p_privacy_consent BOOLEAN DEFAULT true
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := NULLIF(btrim(coalesce(p_email, '')), '');
  v_updated INT;
BEGIN
  IF p_customer_id IS NULL OR p_contact_token IS NULL THEN
    RAISE EXCEPTION 'customer id and token are required';
  END IF;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'email is required';
  END IF;
  IF p_privacy_consent IS NOT TRUE THEN
    RAISE EXCEPTION 'privacy consent is required';
  END IF;

  UPDATE public.customers
  SET email = v_email,
      marketing_consent = coalesce(p_marketing_consent, false),
      privacy_consent = true,
      consent_at = now()
  WHERE id = p_customer_id
    AND contact_token = p_contact_token;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_customer_contact(UUID, UUID, TEXT, BOOLEAN, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_customer_contact(UUID, UUID, TEXT, BOOLEAN, BOOLEAN) TO anon, authenticated, service_role;
