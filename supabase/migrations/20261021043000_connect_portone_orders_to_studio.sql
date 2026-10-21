-- PortOne-backed Selah Money orders shared by the public checkout and Selah Studio.
alter table public.products
  add column if not exists code text,
  add column if not exists price_krw integer,
  add column if not exists delivery_type text not null default 'email_link',
  add column if not exists active boolean not null default true;

update public.products set price_krw = coalesce(price_krw, 0) where price_krw is null;
alter table public.products alter column price_krw set default 0;
alter table public.products alter column price_krw set not null;

create unique index if not exists products_code_unique on public.products (code) where code is not null;

insert into public.products (code, name, price_krw, delivery_type, active)
values
  ('paid_diagnosis_report', '셀라 머니 심층 리포트', 9900, 'email_link', true),
  ('workbook_package', '셀라 머니 워크북', 29000, 'download_link', true),
  ('report_workbook_bundle', '셀라 머니 심층 리포트 + 워크북 세트', 34900, 'email_and_download', true)
on conflict (code) where code is not null do update
set name = excluded.name,
    price_krw = excluded.price_krw,
    delivery_type = excluded.delivery_type,
    active = excluded.active;

alter table public.orders
  add column if not exists order_number text,
  add column if not exists result_number text,
  add column if not exists buyer_name text,
  add column if not exists buyer_email text,
  add column if not exists buyer_phone text,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists external_payment_id text,
  add column if not exists portone_transaction_id text,
  add column if not exists payment_method text,
  add column if not exists payment_provider text,
  add column if not exists requested_at timestamptz,
  add column if not exists refund_consent_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_amount_krw integer not null default 0,
  add column if not exists refund_reason text,
  add column if not exists delivery_status text not null default 'pending',
  add column if not exists delivered_at timestamptz,
  add column if not exists failure_code text,
  add column if not exists failure_message text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.orders alter column status set default 'pending_payment';

create unique index if not exists orders_order_number_unique on public.orders (order_number) where order_number is not null;
create unique index if not exists orders_external_payment_id_unique on public.orders (external_payment_id) where external_payment_id is not null;
create unique index if not exists orders_portone_transaction_id_unique on public.orders (portone_transaction_id) where portone_transaction_id is not null;
create index if not exists orders_payment_status_idx on public.orders (payment_status, created_at desc);
create index if not exists orders_buyer_email_idx on public.orders (lower(buyer_email), created_at desc) where buyer_email is not null;

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider_event_id text not null unique,
  event_type text not null,
  payment_id text not null,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

create index if not exists payment_events_order_idx on public.payment_events (order_id, received_at desc);
create index if not exists payment_events_payment_idx on public.payment_events (payment_id, received_at desc);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.payment_events enable row level security;

grant select on public.products, public.orders, public.payment_events to authenticated;
grant select, insert, update, delete on public.products, public.orders, public.payment_events to service_role;

drop policy if exists "admin can read products" on public.products;
create policy "admin can read products" on public.products for select to authenticated
  using (auth.jwt() ->> 'email' = 'chococo1218@gmail.com');

drop policy if exists "admin can read orders" on public.orders;
create policy "admin can read orders" on public.orders for select to authenticated
  using (auth.jwt() ->> 'email' = 'chococo1218@gmail.com');

drop policy if exists "admin can read payment events" on public.payment_events;
create policy "admin can read payment events" on public.payment_events for select to authenticated
  using (auth.jwt() ->> 'email' = 'chococo1218@gmail.com');

