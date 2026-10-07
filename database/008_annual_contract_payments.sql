BEGIN;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS payment_frequency text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS valid_from date,
  ADD COLUMN IF NOT EXISTS valid_to date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contracts_payment_frequency_check'
  ) THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_payment_frequency_check
      CHECK (payment_frequency IN ('monthly', 'annual'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contracts_valid_dates_check'
  ) THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_valid_dates_check
      CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.contract_annual_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  service_order_id uuid NOT NULL REFERENCES public.contract_service_orders(id) ON DELETE CASCADE,
  payment_process_number text NOT NULL,
  annual_paid_value numeric(14, 2) NOT NULL CHECK (annual_paid_value >= 0),
  glosas_value numeric(14, 2) NOT NULL CHECK (glosas_value >= 0),
  annual_net_value numeric(14, 2)
    GENERATED ALWAYS AS (annual_paid_value - glosas_value) STORED,
  fiscal_year integer NOT NULL CHECK (fiscal_year BETWEEN 1900 AND 9999),
  execution_summary text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contract_annual_entries_order_year_unique UNIQUE (service_order_id, fiscal_year)
);

CREATE INDEX IF NOT EXISTS contract_annual_entries_contract_year_idx
  ON public.contract_annual_entries (contract_id, fiscal_year DESC);

COMMIT;