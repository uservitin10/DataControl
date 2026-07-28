BEGIN;
DELETE FROM audit_logs WHERE user_id = 'c1981b0a-4933-48d1-96a1-ecba8a969ee1';
DELETE FROM profiles WHERE id = 'c1981b0a-4933-48d1-96a1-ecba8a969ee1';
COMMIT;
