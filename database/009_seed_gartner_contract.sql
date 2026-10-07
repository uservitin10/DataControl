BEGIN;

INSERT INTO public.contracts (
  service_order,
  name,
  total_value,
  execution_summary,
  payment_frequency,
  valid_from,
  valid_to
)
VALUES (
  NULL,
  'Gartner',
  2296200.00,
  'Execução financeira anual dos serviços Gartner conforme as OSs 11, 14, 21 e 22.',
  'annual',
  DATE '2024-12-30',
  DATE '2026-12-30'
)
ON CONFLICT (name) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  execution_summary = EXCLUDED.execution_summary,
  payment_frequency = EXCLUDED.payment_frequency,
  valid_from = EXCLUDED.valid_from,
  valid_to = EXCLUDED.valid_to,
  updated_at = NOW();

INSERT INTO public.contract_service_orders (
  contract_id,
  siaf_number,
  sei_document_number,
  valid_from,
  valid_to,
  service_description
)
SELECT
  c.id,
  seed.siaf_number,
  seed.sei_document_number,
  NULL,
  NULL,
  'Ordem de serviço Gartner ' || seed.siaf_number || '.'
FROM public.contracts c
CROSS JOIN (VALUES
  ('11', '47320218'),
  ('14', '55825932'),
  ('21', '62957217'),
  ('22', '63122255')
) AS seed(siaf_number, sei_document_number)
WHERE c.name = 'Gartner'
ON CONFLICT (contract_id, siaf_number) DO UPDATE SET
  sei_document_number = EXCLUDED.sei_document_number,
  valid_from = NULL,
  valid_to = NULL,
  service_description = EXCLUDED.service_description,
  updated_at = NOW();

WITH seed(siaf_number, payment_process_number, annual_paid_value, fiscal_year) AS (
  VALUES
    ('11', '03101.003712/2024-16', 1103600.00::numeric, 2025),
    ('14', '03101.003275/2025-11', 1170200.00::numeric, 2026),
    ('21', '03101.002479/2026-16', 11200.00::numeric, 2026),
    ('22', '03101.002479/2026-16', 11200.00::numeric, 2026)
)
INSERT INTO public.contract_annual_entries (
  contract_id,
  service_order_id,
  payment_process_number,
  annual_paid_value,
  glosas_value,
  fiscal_year,
  execution_summary
)
SELECT
  c.id,
  so.id,
  seed.payment_process_number,
  seed.annual_paid_value,
  0,
  seed.fiscal_year,
  'Execução financeira anual Gartner da OS ' || seed.siaf_number || '.'
FROM seed
JOIN public.contracts c ON c.name = 'Gartner'
JOIN public.contract_service_orders so
  ON so.contract_id = c.id
 AND so.siaf_number = seed.siaf_number
ON CONFLICT (service_order_id, fiscal_year) DO UPDATE SET
  payment_process_number = EXCLUDED.payment_process_number,
  annual_paid_value = EXCLUDED.annual_paid_value,
  glosas_value = EXCLUDED.glosas_value,
  execution_summary = EXCLUDED.execution_summary,
  updated_at = NOW();

INSERT INTO public.contract_financial_documents (
  contract_id,
  fiscal_year,
  document_type,
  document_number,
  sei_reference,
  amount,
  coverage_description
)
SELECT
  c.id,
  seed.fiscal_year,
  seed.document_type,
  seed.document_number,
  seed.sei_reference,
  seed.amount,
  seed.coverage_description
FROM public.contracts c
CROSS JOIN (VALUES
  (2025, 'Certificação de Disponibilidade Orçamentária', '46856406', '46856406', 2571136.00::numeric, 'Cobrir primeiro ano'),
  (2026, 'Nota de Empenho', '2025NE000039 - itens 1 a 4', '55965777', 1170200.00::numeric, 'Cobrir OS 55825932'),
  (2026, 'Certificação de Disponibilidade Orçamentária', '62375528', '62375528', 11200.00::numeric, 'Cobrir OS 62957217'),
  (2026, 'Certificação de Disponibilidade Orçamentária', '63143785', '63143785', 11200.00::numeric, 'Cobrir OS 63122255')
) AS seed(fiscal_year, document_type, document_number, sei_reference, amount, coverage_description)
WHERE c.name = 'Gartner'
ON CONFLICT (contract_id, fiscal_year, document_number) DO UPDATE SET
  document_type = EXCLUDED.document_type,
  sei_reference = EXCLUDED.sei_reference,
  amount = EXCLUDED.amount,
  coverage_description = EXCLUDED.coverage_description,
  updated_at = NOW();

COMMIT;