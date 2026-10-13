-- Selah Money checkout orders. Product name and price are server-side snapshots
-- so payment verification never trusts values supplied by the browser.
CREATE TABLE public.money_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  product_code TEXT NOT NULL CHECK (product_code IN ('report', 'workbook', 'set')),
  product_name TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'KRW' CHECK (currency = 'KRW'),
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  survey_response_id UUID REFERENCES public.survey_responses(id) ON DELETE SET NULL,
  money_type TEXT,
  faith_type TEXT,
  refund_consent_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',
      'paid',
      'failed',
      'cancelled',
      'partially_refunded',
      'refunded',
      'fulfillment_pending',
      'fulfilled'
    )
  ),
  payment_provider TEXT,
  portone_payment_id TEXT UNIQUE,
  portone_transaction_id TEXT UNIQUE,
  failure_code TEXT,
  failure_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX money_orders_created_at_idx ON public.money_orders(created_at DESC);
CREATE INDEX money_orders_email_idx ON public.money_orders(lower(customer_email), created_at DESC);
CREATE INDEX money_orders_status_idx ON public.money_orders(status, created_at DESC);
CREATE INDEX money_orders_survey_response_idx ON public.money_orders(survey_response_id)
  WHERE survey_response_id IS NOT NULL;

ALTER TABLE public.money_orders ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.money_orders TO service_role;
GRANT SELECT, UPDATE ON public.money_orders TO authenticated;

CREATE POLICY "Admins can view money orders"
  ON public.money_orders FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update money orders"
  ON public.money_orders FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER money_orders_updated_at BEFORE UPDATE ON public.money_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.money_orders IS
  'Server-created Selah Money orders used as the source of truth for PortOne payment verification and fulfillment.';
COMMENT ON COLUMN public.money_orders.order_number IS
  'Human-readable order number; also used as the PortOne paymentId.';

