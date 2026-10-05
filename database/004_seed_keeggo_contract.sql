INSERT INTO public.contracts (service_order, name, total_value, execution_summary)
VALUES (
  NULL,
  'Keeggo',
  213649.83,
  '01 Analista de Testes/Qualidade - Sênior para o PFE.'
)
ON CONFLICT (name) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  execution_summary = EXCLUDED.execution_summary;

INSERT INTO public.contract_service_orders (
  contract_id,
  service_order_number,
  internal_number,
  valid_from,
  valid_to,
  service_description
)
SELECT
  c.id,
  seed.service_order_number,
  seed.internal_number,
  seed.valid_from,
  seed.valid_to,
  '01 Analista de Testes/Qualidade - Sênior para o PFE.'
FROM public.contracts c
CROSS JOIN (VALUES
  ('03101.000975/2025-54', '50465842', DATE '2025-05-12', DATE '2025-12-31'),
  ('03101.000872/2026-75', '59640678', DATE '2026-05-01', DATE '2026-08-31'),
  ('03101.002392/2026-49', '63624017', DATE '2026-09-01', DATE '2026-12-31')
) AS seed(service_order_number, internal_number, valid_from, valid_to)
WHERE c.name = 'Keeggo'
ON CONFLICT (contract_id, service_order_number) DO UPDATE SET
  internal_number = EXCLUDED.internal_number,
  valid_from = EXCLUDED.valid_from,
  valid_to = EXCLUDED.valid_to,
  service_description = EXCLUDED.service_description,
  updated_at = NOW();

WITH seed(service_order_number, reference_month, payment_process_number, payment_value, empenho) AS (
  VALUES
    ('03101.000975/2025-54', DATE '2025-05-01', '03101.001662/2025-13', 8700.75::numeric, '2025NE001198'),
    ('03101.000975/2025-54', DATE '2025-06-01', '03101.001978/2025-13', 14501.25::numeric, '2025NE001198'),
    ('03101.000975/2025-54', DATE '2025-07-01', '03101.002228/2025-51', 14501.25::numeric, '2025NE001198'),
    ('03101.000975/2025-54', DATE '2025-08-01', '03101.002606/2025-04', 14501.25::numeric, '2025NE001198'),
    ('03101.000975/2025-54', DATE '2025-09-01', '03101.002887/2025-97', 14501.25::numeric, '2025NE001198'),
    ('03101.000975/2025-54', DATE '2025-10-01', '12804.002870/2025-11', 14501.25::numeric, '2025NE001198'),
    ('03101.000975/2025-54', DATE '2025-11-01', '12804.003266/2025-02', 14501.25::numeric, '2025NE001198'),
    ('03101.000975/2025-54', DATE '2025-12-01', '12804.000101/2026-51', 14501.25::numeric, '2025NE001198'),
    ('03101.000975/2025-54', DATE '2026-01-01', '12804.000268/2026-12', 14501.25::numeric, '2025NE001931'),
    ('03101.000975/2025-54', DATE '2026-02-01', '12804.000397/2026-19', 14501.25::numeric, '2025NE001931'),
    ('03101.000975/2025-54', DATE '2026-03-01', '12804.000664/2026-40', 14501.25::numeric, '2025NE001931'),
    ('03101.000975/2025-54', DATE '2026-04-01', '12804.001022/2026-68', 14501.25::numeric, '2025NE001931'),
    ('03101.000872/2026-75', DATE '2026-05-01', '12804.001252/2026-27', 15145.11::numeric, '2026NE000742'),
    ('03101.000872/2026-75', DATE '2026-06-01', '03101.001990/2026-09', 15145.11::numeric, '2026NE000742'),
    ('03101.000872/2026-75', DATE '2026-07-01', '03101.002323/2026-35', 15145.11::numeric, '2026NE000742')
)
INSERT INTO public.contract_monthly_entries (
  contract_id,
  service_order_id,
  payment_process_number,
  monthly_paid_value,
  glosas_value,
  reference_month,
  execution_summary,
  empenho
)
SELECT
  c.id,
  so.id,
  seed.payment_process_number,
  seed.payment_value,
  0,
  seed.reference_month,
  '01 Analista de Testes/Qualidade - Sênior para o PFE.',
  seed.empenho
FROM seed
JOIN public.contracts c ON c.name = 'Keeggo'
JOIN public.contract_service_orders so
  ON so.contract_id = c.id
 AND so.service_order_number = seed.service_order_number
ON CONFLICT (service_order_id, reference_month) DO UPDATE SET
  payment_process_number = EXCLUDED.payment_process_number,
  monthly_paid_value = EXCLUDED.monthly_paid_value,
  glosas_value = EXCLUDED.glosas_value,
  execution_summary = EXCLUDED.execution_summary,
  empenho = EXCLUDED.empenho,
  updated_at = NOW();

INSERT INTO public.contract_financial_documents (
  contract_id, fiscal_year, document_type, document_number, sei_reference, amount, coverage_description
)
SELECT c.id, seed.fiscal_year, seed.document_type, seed.document_number, seed.sei_reference, seed.amount, seed.coverage_description
FROM public.contracts c
CROSS JOIN (VALUES
  (2025, 'Nota de Empenho', '2025NE001198', '52083459', 110209.50::numeric, 'Cobrir OS 03101.000975/2025-54'),
  (2026, 'Nota de Empenho', '2025NE001931', '56385880', 58005.00::numeric, 'Cobrir Termo Aditivo 56210531'),
  (2026, 'Nota de Empenho', '2026NE000742', '59082766', 58005.00::numeric, 'Cobrir OS 03101.000872/2026-75'),
  (2026, 'Registro de Reforço', '2026NE000742-MPO', '62371010', 2575.44::numeric, 'Cobrir reajuste contratual'),
  (2026, 'Nota de Crédito', '2026NC000042', '63948737', 60580.44::numeric, 'Cobrir OS 03101.002392/2026-49')
) AS seed(fiscal_year, document_type, document_number, sei_reference, amount, coverage_description)
WHERE c.name = 'Keeggo'
ON CONFLICT (contract_id, fiscal_year, document_number) DO UPDATE SET
  document_type = EXCLUDED.document_type,
  sei_reference = EXCLUDED.sei_reference,
  amount = EXCLUDED.amount,
  coverage_description = EXCLUDED.coverage_description,
  updated_at = NOW();