
-- =========================================================
-- Helper: updated_at trigger
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- admin_users + is_admin() (security definer)
-- =========================================================
CREATE TABLE public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = _user_id);
$$;

CREATE POLICY "Admins can view admin list"
  ON public.admin_users FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can add admins"
  ON public.admin_users FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can remove admins"
  ON public.admin_users FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- =========================================================
-- surveys
-- =========================================================
CREATE TABLE public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  completion_message TEXT NOT NULL DEFAULT '응답해 주셔서 감사합니다.',
  audience_type TEXT NOT NULL DEFAULT 'general' CHECK (audience_type IN ('general','christian')),
  category TEXT NOT NULL DEFAULT 'other',
  estimated_time TEXT NOT NULL DEFAULT '약 3분',
  bible_verse TEXT,
  result_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  design_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  share_card JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','closed')),
  source_json TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX surveys_status_idx ON public.surveys(status) WHERE deleted_at IS NULL;
CREATE INDEX surveys_slug_idx ON public.surveys(slug);

GRANT SELECT ON public.surveys TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surveys TO authenticated;
GRANT ALL ON public.surveys TO service_role;

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

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

CREATE TRIGGER surveys_updated_at BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- survey_questions
-- =========================================================
CREATE TABLE public.survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('short_text','long_text','single_choice','multiple_choice','scale_1_5')),
  text TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  options JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX survey_questions_survey_idx ON public.survey_questions(survey_id, position);

GRANT SELECT ON public.survey_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_questions TO authenticated;
GRANT ALL ON public.survey_questions TO service_role;

ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;

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

CREATE TRIGGER survey_questions_updated_at BEFORE UPDATE ON public.survey_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- customers
-- =========================================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  in_lounge BOOLEAN NOT NULL DEFAULT false,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid')),
  payment_provider TEXT,
  payment_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX customers_email_idx ON public.customers(lower(email));

-- NOTE: anon INSERT allowed so respondents can register themselves at submission time.
-- No anon SELECT — the customer list is admin-only.
GRANT INSERT ON public.customers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a customer record"
  ON public.customers FOR INSERT TO anon, authenticated
  WITH CHECK (true);

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

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- survey_responses
-- =========================================================
CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_type_id TEXT,
  in_lounge BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX survey_responses_survey_idx ON public.survey_responses(survey_id, submitted_at DESC);
CREATE INDEX survey_responses_customer_idx ON public.survey_responses(customer_id);

-- anon may INSERT only; no anon SELECT — response list is admin-only.
GRANT INSERT ON public.survey_responses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_responses TO authenticated;
GRANT ALL ON public.survey_responses TO service_role;

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

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

CREATE TRIGGER survey_responses_updated_at BEFORE UPDATE ON public.survey_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
