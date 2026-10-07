BEGIN;

INSERT INTO public.contracts (service_order, name, total_value, execution_summary)
VALUES (
  NULL,
  'Qintess',
  530253.05,
  '01 Analista de Testes/Qualidade - Sênior e 01 Desenvolvedor de Software - Sênior para o PFE. OS 03101.000935/2025-11, com Termo Aditivo SEI 56208959, e OS 03101.000870/2026-86.'
)
ON CONFLICT (name) DO UPDATE SET
  total_value = EXCLUDED.total_value,
  execution_summary = EXCLUDED.execution_summary,
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
  seed.valid_from,
  seed.valid_to,
  '01 Analista de Testes/Qualidade - Sênior e 01 Desenvolvedor de Software - Sênior para o PFE.'
FROM public.contracts c
CROSS JOIN (VALUES
  ('03101.000935/2025-11', '50508361', DATE '2025-05-12', DATE '2026-04-30'),
  ('03101.000870/2026-86', '59639975', DATE '2026-05-01', DATE '2026-08-31')
) AS seed(siaf_number, sei_document_number, valid_from, valid_to)
WHERE c.name = 'Qintess'
ON CONFLICT (contract_id, siaf_number) DO UPDATE SET
  sei_document_number = EXCLUDED.sei_document_number,
  valid_from = EXCLUDED.valid_from,
  valid_to = EXCLUDED.valid_to,
  service_description = EXCLUDED.service_description,
  updated_at = NOW();

WITH seed(siaf_number, reference_month, payment_process_number, payment_value, empenho) AS (
  VALUES
    ('03101.000935/2025-11', DATE '2025-05-01', 'Não há', 0.00::numeric, 'Sem empenho'),
    ('03101.000935/2025-11', DATE '2025-06-01', '03101.002085/2025-87', 31888.70::numeric, '2025NE001192'),
    ('03101.000935/2025-11', DATE '2025-07-01', '03101.002311/2025-20', 37946.91::numeric, '2025NE001192'),
    ('03101.000935/2025-11', DATE '2025-08-01', '03101.002529/2025-84', 37946.91::numeric, '2025NE001192'),
    ('03101.000935/2025-11', DATE '2025-09-01', '03101.002884/2025-53', 37946.91::numeric, '2025NE001192'),
    ('03101.000935/2025-11', DATE '2025-10-01', '03101.003173/2025-04', 37946.91::numeric, '2025NE001192'),
    ('03101.000935/2025-11', DATE '2025-11-01', '03101.003386/2025-28', 37946.91::numeric, '2025NE001192'),
    ('03101.000935/2025-11', DATE '2025-12-01', '03101.000116/2026-46', 37946.91::numeric, '2025NE001192'),
    ('03101.000935/2025-11', DATE '2026-01-01', '03101.000435/2026-51', 37946.91::numeric, '2025NE001927-MPO'),
    ('03101.000935/2025-11', DATE '2026-02-01', '19962.000257/2026-69', 37946.91::numeric, '2025NE001927-MPO'),
    ('03101.000935/2025-11', DATE '2026-03-01', '12804.001207/2026-72', 37946.91::numeric, '2025NE001927-MPO'),
    ('03101.000935/2025-11', DATE '2026-04-01', '12804.001208/2026-17', 37946.91::numeric, '2025NE001927-MPO'),
    ('03101.000870/2026-86', DATE '2026-05-01', '12804.001740/2026-34', 39631.75::numeric, '2026NE00741'),
    ('03101.000870/2026-86', DATE '2026-06-01', '12804.001741/2026-89', 39631.75::numeric, '2026NE00741'),
    ('03101.000870/2026-86', DATE '2026-07-01', '12804.001782/2026-75', 39631.75::numeric, '2026NE00741')
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
  '01 Analista de Testes/Qualidade - Sênior e 01 Desenvolvedor de Software - Sênior para o PFE.',
  seed.empenho
FROM seed
JOIN public.contracts c ON c.name = 'Qintess'
JOIN public.contract_service_orders so
  ON so.contract_id = c.id
 AND so.siaf_number = seed.siaf_number
WHERE NOT EXISTS (
  SELECT 1
  FROM public.contract_monthly_entries existing
  WHERE existing.service_order_id = so.id
    AND existing.reference_month = seed.reference_month
    AND existing.payment_process_number = seed.payment_process_number
);

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
  (2025, 'Nota de Empenho', '2025NE001192', '51993469', 259570.08::numeric, 'Cobrir a OS 03101.000935/2025-11'),
  (2026, 'Nota de Empenho', '2025NE001927-MPO', '56366184', 151787.00::numeric, 'Cobrir o Termo Aditivo 56208959'),
  (2026, 'Nota de Empenho', '2026NE00741', '59080754', 151787.64::numeric, 'Cobrir a OS 03101.000870/2026-86'),
  (2026, 'Registro de Reforço', '2026NE000741', '63998893', 125634.61::numeric, 'Prorrogação da OS 03101.000870/2026-86 e reajuste contratual'),
  (2026, 'Registro de Anulação parcial', '2026NE000741-MPO', '64105682', 118895.15::numeric, 'Valor anulado devido à rescisão contratual')
) AS seed(fiscal_year, document_type, document_number, sei_reference, amount, coverage_description)
WHERE c.name = 'Qintess'
ON CONFLICT (contract_id, fiscal_year, document_number) DO UPDATE SET
  document_type = EXCLUDED.document_type,
  sei_reference = EXCLUDED.sei_reference,
  amount = EXCLUDED.amount,
  coverage_description = EXCLUDED.coverage_description,
  updated_at = NOW();

COMMIT;