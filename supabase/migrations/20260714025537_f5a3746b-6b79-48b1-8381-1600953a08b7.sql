
-- 1) Trigger-only functions: remove executable access from clients
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_admin_on_auth() FROM PUBLIC, anon, authenticated;

-- 2) is_admin -> SECURITY INVOKER; allow authenticated to see own admin row
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users a WHERE a.user_id = _user_id
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

CREATE POLICY "Authenticated can read own admin row"
ON public.admin_users FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3) Ownership-validated survey response submission
CREATE OR REPLACE FUNCTION public.submit_survey_response(
  p_response_id text,
  p_survey_id text,
  p_customer_id text,
  p_contact_token uuid,
  p_answers jsonb,
  p_result_type_id text DEFAULT NULL,
  p_in_lounge boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_email text;
BEGIN
  IF p_response_id IS NULL OR p_survey_id IS NULL
     OR p_customer_id IS NULL OR p_contact_token IS NULL THEN
    RAISE EXCEPTION 'missing required parameters';
  END IF;

  SELECT c.name, c.email INTO v_name, v_email
  FROM public.customers c
  WHERE c.id = p_customer_id AND c.contact_token = p_contact_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid customer token';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = p_survey_id
      AND s.status = 'published'
      AND s.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'survey not available';
  END IF;

  INSERT INTO public.survey_responses (
    id, survey_id, customer_id, customer_name, customer_email,
    answers, result_type_id, in_lounge, submitted_at
  ) VALUES (
    p_response_id, p_survey_id, p_customer_id, v_name, v_email,
    COALESCE(p_answers, '{}'::jsonb), p_result_type_id,
    COALESCE(p_in_lounge, false), now()
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_survey_response(text,text,text,uuid,jsonb,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_survey_response(text,text,text,uuid,jsonb,text,boolean) TO anon, authenticated;

-- 4) Remove the permissive anon INSERT policy on survey_responses
DROP POLICY IF EXISTS "Anyone can submit a response to a published survey" ON public.survey_responses;
