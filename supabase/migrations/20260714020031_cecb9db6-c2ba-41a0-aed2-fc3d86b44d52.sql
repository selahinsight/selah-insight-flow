
-- Drop policies that reference id columns (will recreate identically)
DROP POLICY IF EXISTS "Anyone can view published surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admins can view all surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admins can insert surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admins can update surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admins can delete surveys" ON public.surveys;

DROP POLICY IF EXISTS "Anyone can view questions of published surveys" ON public.survey_questions;
DROP POLICY IF EXISTS "Admins can view all questions" ON public.survey_questions;
DROP POLICY IF EXISTS "Admins can manage questions" ON public.survey_questions;

DROP POLICY IF EXISTS "Anyone can submit a response to a published survey" ON public.survey_responses;
DROP POLICY IF EXISTS "Admins can view responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Admins can update responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Admins can delete responses" ON public.survey_responses;

DROP POLICY IF EXISTS "Admins can view customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can create a customer record" ON public.customers;

-- Drop FKs
ALTER TABLE public.survey_responses DROP CONSTRAINT IF EXISTS survey_responses_survey_id_fkey;
ALTER TABLE public.survey_responses DROP CONSTRAINT IF EXISTS survey_responses_customer_id_fkey;
ALTER TABLE public.survey_questions DROP CONSTRAINT IF EXISTS survey_questions_survey_id_fkey;

-- Convert id columns to TEXT
ALTER TABLE public.surveys ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.surveys ALTER COLUMN id TYPE TEXT USING id::text;

ALTER TABLE public.survey_questions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.survey_questions ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.survey_questions ALTER COLUMN survey_id TYPE TEXT USING survey_id::text;

ALTER TABLE public.customers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.customers ALTER COLUMN id TYPE TEXT USING id::text;

ALTER TABLE public.survey_responses ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.survey_responses ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.survey_responses ALTER COLUMN survey_id TYPE TEXT USING survey_id::text;
ALTER TABLE public.survey_responses ALTER COLUMN customer_id TYPE TEXT USING customer_id::text;

-- Re-add FKs
ALTER TABLE public.survey_questions
  ADD CONSTRAINT survey_questions_survey_id_fkey
  FOREIGN KEY (survey_id) REFERENCES public.surveys(id) ON DELETE CASCADE;

ALTER TABLE public.survey_responses
  ADD CONSTRAINT survey_responses_survey_id_fkey
  FOREIGN KEY (survey_id) REFERENCES public.surveys(id) ON DELETE CASCADE;

ALTER TABLE public.survey_responses
  ADD CONSTRAINT survey_responses_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

-- Recreate RLS policies (identical to previous)
CREATE POLICY "Anyone can view published surveys"
  ON public.surveys FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY "Admins can view all surveys"
  ON public.surveys FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert surveys"
  ON public.surveys FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update surveys"
  ON public.surveys FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete surveys"
  ON public.surveys FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can view questions of published surveys"
  ON public.survey_questions FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_questions.survey_id
      AND s.status = 'published'
      AND s.deleted_at IS NULL
  ));

CREATE POLICY "Admins can view all questions"
  ON public.survey_questions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage questions"
  ON public.survey_questions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can submit a response to a published survey"
  ON public.survey_responses FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_responses.survey_id
      AND s.status = 'published'
      AND s.deleted_at IS NULL
  ));

CREATE POLICY "Admins can view responses"
  ON public.survey_responses FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update responses"
  ON public.survey_responses FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete responses"
  ON public.survey_responses FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view customers"
  ON public.customers FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update customers"
  ON public.customers FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete customers"
  ON public.customers FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Recreate RPCs with TEXT customer id
DROP FUNCTION IF EXISTS public.create_customer_contact(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.create_customer_contact(
  p_name TEXT DEFAULT NULL,
  p_nickname TEXT DEFAULT NULL
)
RETURNS TABLE (id TEXT, contact_token UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT := NULLIF(btrim(coalesce(p_name, '')), '');
  v_nick TEXT := NULLIF(btrim(coalesce(p_nickname, '')), '');
  v_id TEXT;
  v_token UUID;
BEGIN
  IF v_name IS NULL AND v_nick IS NULL THEN
    RAISE EXCEPTION 'name or nickname is required';
  END IF;

  v_id := 'cu_' || encode(gen_random_bytes(6), 'hex');

  INSERT INTO public.customers (id, name, nickname)
  VALUES (v_id, v_name, v_nick)
  RETURNING customers.id, customers.contact_token INTO v_id, v_token;

  RETURN QUERY SELECT v_id, v_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_customer_contact(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_customer_contact(TEXT, TEXT) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.update_customer_contact(UUID, UUID, TEXT, BOOLEAN, BOOLEAN);
CREATE OR REPLACE FUNCTION public.update_customer_contact(
  p_customer_id TEXT,
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

REVOKE EXECUTE ON FUNCTION public.update_customer_contact(TEXT, UUID, TEXT, BOOLEAN, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_customer_contact(TEXT, UUID, TEXT, BOOLEAN, BOOLEAN) TO anon, authenticated, service_role;
