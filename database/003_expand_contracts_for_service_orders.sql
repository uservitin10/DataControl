ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS execution_summary text NOT NULL DEFAULT '';

UPDATE public.contracts
SET name = COALESCE(NULLIF(name, ''), NULLIF(service_order, ''), 'Contrato ' || id::text)
WHERE name IS NULL OR name = '';

ALTER TABLE public.contracts
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN service_order DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contracts_name_unique_idx
  ON public.contracts (name);

CREATE TABLE IF NOT EXISTS public.contract_service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  service_order_number text NOT NULL,
  internal_number text NOT NULL DEFAULT '',
  valid_from date,
  valid_to date,
  service_description text NOT NULL,
  addendum_number text,
  addendum_valid_from date,
  addendum_valid_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contract_service_orders_valid_dates CHECK (
    valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to
  ),
  CONSTRAINT contract_service_orders_addendum_dates CHECK (
    addendum_valid_from IS NULL OR addendum_valid_to IS NULL OR addendum_valid_from <= addendum_valid_to
  ),
  CONSTRAINT contract_service_orders_contract_number_unique UNIQUE (contract_id, service_order_number)
);

INSERT INTO public.contract_service_orders (contract_id, service_order_number, service_description)
SELECT c.id, c.service_order, COALESCE(NULLIF(c.execution_summary, ''), 'Resumo da execução não informado.')
FROM public.contracts c
WHERE c.service_order IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.contract_service_orders so
    WHERE so.contract_id = c.id AND so.service_order_number = c.service_order
  );

ALTER TABLE public.contract_monthly_entries
  ADD COLUMN IF NOT EXISTS service_order_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contract_monthly_entries_service_order_fk'
  ) THEN
    ALTER TABLE public.contract_monthly_entries
      ADD CONSTRAINT contract_monthly_entries_service_order_fk
      FOREIGN KEY (service_order_id)
      REFERENCES public.contract_service_orders(id)
      ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.contract_monthly_entries e
SET service_order_id = so.id
FROM public.contract_service_orders so
WHERE e.service_order_id IS NULL
  AND so.contract_id = e.contract_id;

ALTER TABLE public.contract_monthly_entries
  ALTER COLUMN service_order_id SET NOT NULL,
  ADD COLUMN IF NOT EXISTS monthly_net_value numeric(14, 2)
    GENERATED ALWAYS AS (monthly_paid_value - glosas_value) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS contract_monthly_entries_service_order_month_unique_idx
  ON public.contract_monthly_entries (service_order_id, reference_month);

CREATE TABLE IF NOT EXISTS public.contract_financial_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  fiscal_year integer NOT NULL,
  document_type text NOT NULL,
  document_number text NOT NULL,
  sei_reference text NOT NULL,
  amount numeric(14, 2) NOT NULL CHECK (amount >= 0),
  coverage_description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contract_financial_documents_unique UNIQUE (contract_id, fiscal_year, document_number)
);

CREATE INDEX IF NOT EXISTS contract_service_orders_contract_idx
  ON public.contract_service_orders (contract_id, valid_from);

CREATE INDEX IF NOT EXISTS contract_financial_documents_contract_year_idx
  ON public.contract_financial_documents (contract_id, fiscal_year, created_at);