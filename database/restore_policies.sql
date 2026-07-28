-- audit_logs
CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT TO public
  WITH CHECK (auth.role() = 'authenticated'::text);

-- modulos
CREATE POLICY "Allow authenticated create" ON public.modulos
  FOR INSERT TO public
  WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Allow authenticated delete" ON public.modulos
  FOR DELETE TO public
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Allow authenticated update" ON public.modulos
  FOR UPDATE TO public
  USING (auth.role() = 'authenticated'::text);

-- profiles
CREATE POLICY insert_own_profile ON public.profiles
  FOR INSERT TO public
  WITH CHECK (auth.uid() = id);

CREATE POLICY select_own_profile ON public.profiles
  FOR SELECT TO public
  USING ((auth.uid() = id) OR (get_my_role() = 'admin'::text));

CREATE POLICY update_own_profile ON public.profiles
  FOR UPDATE TO public
  USING ((auth.uid() = id) OR (get_my_role() = 'admin'::text));

-- role_permissions
CREATE POLICY role_permissions_select ON public.role_permissions
  FOR SELECT TO public
  USING (auth.role() = 'authenticated'::text);

-- user_permissions
CREATE POLICY user_permissions_own_select ON public.user_permissions
  FOR SELECT TO public
  USING (user_id = auth.uid());

-- levantamento_ativos
CREATE POLICY "Edição pelo criador ou admin" ON public.levantamento_ativos
  FOR UPDATE TO authenticated
  USING (
    (criado_por = auth.uid()) OR EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::text
    )
  );

CREATE POLICY "Inserção restrita" ON public.levantamento_ativos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['admin'::text, 'editor'::text, 'inventario_editor'::text])
    )
  );

CREATE POLICY "Leitura autenticada" ON public.levantamento_ativos
  FOR SELECT TO authenticated
  USING (true);