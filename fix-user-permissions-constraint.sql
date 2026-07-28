-- fix-user-permissions-constraint.sql
ALTER TABLE user_permissions
  DROP CONSTRAINT user_permissions_module_check;

ALTER TABLE user_permissions
  ADD CONSTRAINT user_permissions_module_check
  CHECK (module = ANY (ARRAY[
    'dashboard'::text,
    'painel'::text,
    'sistemas'::text,
    'inventario'::text,
    'levantamento'::text,
    'usuarios'::text,
    'registros'::text,
    'notificacoes'::text,
    'areas'::text,
    'fontes_dados'::text
  ]));