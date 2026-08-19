SET client_encoding = 'UTF8';

\pset pager off

\echo '--- Total de grupos de licenca duplicada e total de registros afetados ---'
SELECT COUNT(*) AS grupos_duplicados, SUM(ocorrencias) AS total_registros_em_duplicata
FROM (
  SELECT asset_id, COUNT(*) AS ocorrencias
  FROM inventory_items
  WHERE type ILIKE '%lic%'
  GROUP BY asset_id
  HAVING COUNT(*) > 1
) sub;

\echo '--- equipment_state por type (ver se o campo em branco eh so em equipamento fisico) ---'
SELECT type, equipment_state, COUNT(*) AS total
FROM inventory_items
GROUP BY type, equipment_state
ORDER BY type, total DESC;

\echo '--- warranty: populado ou nao, por type ---'
SELECT type,
  COUNT(*) FILTER (WHERE warranty IS NULL OR warranty = '') AS warranty_vazio,
  COUNT(*) FILTER (WHERE warranty IS NOT NULL AND warranty <> '') AS warranty_preenchido
FROM inventory_items
GROUP BY type;

\echo '--- teste de encoding real (bytes crus de uma string conhecida) ---'
SELECT type, octet_length(type) AS bytes, length(type) AS caracteres
FROM inventory_items
WHERE type ILIKE '%lic%'
LIMIT 1;
