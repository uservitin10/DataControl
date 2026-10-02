CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order text NOT NULL,
  total_value numeric(14, 2) NOT NULL CHECK (total_value >= 0),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_monthly_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  payment_process_number text NOT NULL,
  monthly_paid_value numeric(14, 2) NOT NULL CHECK (monthly_paid_value >= 0),
  glosas_value numeric(14, 2) NOT NULL CHECK (glosas_value >= 0),
  reference_month date NOT NULL,
  execution_summary text NOT NULL,
  empenho text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contract_monthly_entries_month_start CHECK (
    EXTRACT(DAY FROM reference_month) = 1
  )
);

CREATE INDEX IF NOT EXISTS contracts_service_order_idx
  ON public.contracts (service_order);

CREATE INDEX IF NOT EXISTS contract_monthly_entries_contract_month_idx
  ON public.contract_monthly_entries (contract_id, reference_month DESC);