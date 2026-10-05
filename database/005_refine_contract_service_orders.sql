BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contract_service_orders'
      AND column_name = 'service_order_number'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contract_service_orders'
      AND column_name = 'siaf_number'
  ) THEN
    ALTER TABLE public.contract_service_orders
      RENAME COLUMN service_order_number TO siaf_number;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contract_service_orders'
      AND column_name = 'internal_number'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contract_service_orders'
      AND column_name = 'sei_document_number'
  ) THEN
    ALTER TABLE public.contract_service_orders
      RENAME COLUMN internal_number TO sei_document_number;
  END IF;
END $$;

ALTER TABLE public.contract_service_orders
  DROP COLUMN IF EXISTS addendum_number,
  DROP COLUMN IF EXISTS addendum_valid_from,
  DROP COLUMN IF EXISTS addendum_valid_to;

UPDATE public.contract_financial_documents
SET coverage_description = 'Cobertura complementar da execução contratual'
WHERE coverage_description = 'Cobrir Termo Aditivo 56210531';

COMMIT;