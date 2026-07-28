CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.current_role', true), '')
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.can_user(p_module text, p_action text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE p_action
    WHEN 'view'   THEN rp.can_view
    WHEN 'edit'   THEN rp.can_edit
    WHEN 'delete' THEN rp.can_delete
    ELSE FALSE
  END
  FROM public.role_permissions rp
  JOIN public.modules m ON m.id = rp.module_id
  WHERE rp.role = public.get_my_role()
    AND m.name  = p_module
$function$;