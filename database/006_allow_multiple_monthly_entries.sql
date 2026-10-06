BEGIN;

DROP INDEX IF EXISTS public.contract_monthly_entries_service_order_month_unique_idx;

CREATE INDEX IF NOT EXISTS contract_monthly_entries_service_order_month_idx
  ON public.contract_monthly_entries (service_order_id, reference_month DESC);

COMMIT;