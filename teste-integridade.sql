-- ==========================================================
-- Teste de integridade — inventory_items (Postgres self-host)
-- ==========================================================

\echo '--- 1. Contagem total (esperado: 460) ---'
SELECT COUNT(*) AS total FROM inventory_items;

\echo '--- 2. Contagem por type ---'
SELECT type, COUNT(*) AS total
FROM inventory_items
GROUP BY type
ORDER BY total DESC;

\echo '--- 3. IDs duplicados (esperado: 0 linhas, id é PK então não deveria ocorrer, é só sanity check) ---'
SELECT id, COUNT(*) AS ocorrencias
FROM inventory_items
GROUP BY id
HAVING COUNT(*) > 1;

\echo '--- 4. Valores nulos nas colunas essenciais ---'
SELECT
  COUNT(*) FILTER (WHERE type IS NULL) AS type_null,
  COUNT(*) FILTER (WHERE model IS NULL) AS model_null,
  COUNT(*) FILTER (WHERE responsible IS NULL) AS responsible_null,
  COUNT(*) FILTER (WHERE asset_id IS NULL) AS asset_id_null,
  COUNT(*) FILTER (WHERE allocated_user_id IS NULL) AS allocated_user_id_null,
  COUNT(*) FILTER (WHERE created_by IS NULL) AS created_by_null
FROM inventory_items;

\echo '--- 5. Licenças duplicadas por asset_id (mesmo teste que remove-duplicate-licenses faz) ---'
SELECT asset_id, COUNT(*) AS ocorrencias
FROM inventory_items
WHERE type ILIKE '%lic%'
GROUP BY asset_id
HAVING COUNT(*) > 1
ORDER BY ocorrencias DESC;

\echo '--- 6. allocated_user_id órfão (aponta pra profile inexistente) ---'
SELECT ii.id, ii.allocated_user_id
FROM inventory_items ii
LEFT JOIN profiles p ON p.id = ii.allocated_user_id
WHERE ii.allocated_user_id IS NOT NULL
  AND p.id IS NULL;

\echo '--- 7. created_by órfão (aponta pra profile inexistente) ---'
SELECT ii.id, ii.created_by
FROM inventory_items ii
LEFT JOIN profiles p ON p.id = ii.created_by
WHERE ii.created_by IS NOT NULL
  AND p.id IS NULL;

\echo '--- 8. Itens legados (sem allocated_user_id, dependem de allocated_user texto) ---'
SELECT COUNT(*) AS itens_legados
FROM inventory_items
WHERE allocated_user_id IS NULL;

\echo '--- 9. equipment_state — valores distintos usados (conferir se batem com o que o frontend espera: ativa/ativo etc) ---'
SELECT equipment_state, COUNT(*) AS total
FROM inventory_items
GROUP BY equipment_state
ORDER BY total DESC;

\echo '--- 10. Amostra de 5 linhas para inspeção visual ---'
SELECT id, type, model, asset_id, responsible, allocated_user, allocated_user_id, equipment_state
FROM inventory_items
LIMIT 5;

\echo '--- FIM ---'