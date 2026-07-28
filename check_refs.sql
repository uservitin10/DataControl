SELECT 'audit_logs' AS tabela, count(*) FROM audit_logs WHERE user_id = 'c1981b0a-4933-48d1-96a1-ecba8a969ee1'
UNION ALL
SELECT 'password_reset_tokens', count(*) FROM password_reset_tokens WHERE user_id = 'c1981b0a-4933-48d1-96a1-ecba8a969ee1'
UNION ALL
SELECT 'registros', count(*) FROM registros WHERE criado_por = 'c1981b0a-4933-48d1-96a1-ecba8a969ee1';
