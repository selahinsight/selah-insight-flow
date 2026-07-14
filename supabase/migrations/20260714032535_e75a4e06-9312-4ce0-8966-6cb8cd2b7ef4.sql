CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
  survey_response_id TEXT REFERENCES public.survey_responses(id) ON DELETE SET NULL,
  survey_id TEXT REFERENCES public.surveys(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  email_type TEXT NOT NULL DEFAULT 'free_result',
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  provider_message_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.email_logs TO service_role;
GRANT SELECT ON public.email_logs TO authenticated;

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read email logs"
ON public.email_logs
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX idx_email_logs_created_at ON public.email_logs (created_at DESC);
CREATE INDEX idx_email_logs_customer_id ON public.email_logs (customer_id);
CREATE INDEX idx_email_logs_survey_response_id ON public.email_logs (survey_response_id);