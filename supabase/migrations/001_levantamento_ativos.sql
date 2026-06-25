-- Criar tabela levantamento_ativos conforme Portaria GM/MPO N° 201, de 10 de julho de 2025
CREATE TABLE IF NOT EXISTS public.levantamento_ativos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'rascunho', 'concluido')),
  
  -- INFORMAÇÕES DO RESPONDENTE
  nome_respondente text NOT NULL,
  secretaria text NOT NULL,
  unidade_responsavel text NOT NULL,
  cargo text,
  
  -- SEÇÃO 1: IDENTIFICAÇÃO DO ATIVO
  nome_ativo text NOT NULL,
  tipo_ativo text[] NOT NULL,
  sigla_abreviacao text,
  finalidade_funcao text NOT NULL,
  responsavel_negocio text NOT NULL,
  responsavel_tecnico text,
  status_ativo text CHECK (status_ativo IN ('em_uso', 'legado', 'em_desenvolvimento')),
  
  -- SEÇÃO 2: CARACTERÍSTICAS TÉCNICAS
  uso_ativo text[] CHECK (uso_ativo <@ ARRAY['operacional', 'gerencial', 'estrategico']),
  tecnologia_armazenamento text CHECK (tecnologia_armazenamento IN ('planilhas', 'sql', 'nosql', 'nuvem', 'sharepoint')),
  possui_backup text CHECK (possui_backup IN ('nao', 'nuvem', 'sharepoint', 'servidor_interno')),
  volume_dados_atual text,
  frequencia_atualizacao text CHECK (frequencia_atualizacao IN ('diario', 'semanal', 'mensal', 'semestral', 'anual', 'nao_atualiza')),
  crescimento_estimado text,
  linguagem_programacao text,
  
  -- SEÇÃO 3: CATEGORIZAÇÃO DE DADOS
  nivel_sigilo text CHECK (nivel_sigilo IN ('pessoal', 'sigiloso', 'publico')),
  natureza_dados text CHECK (natureza_dados IN ('pessoais', 'pessoais_sensiveis', 'anonimizado', 'nenhuma')),
  nivel_acesso text[] CHECK (nivel_acesso <@ ARRAY['publico', 'interno', 'restrito']),
  norma_especifica text,
  risco_percebido text,
  necessita_termo_responsabilidade boolean,
  observacao_juridica text,
  
  -- SEÇÃO 4: INTEGRAÇÃO
  existe_api text CHECK (existe_api IN ('nao', 'publica', 'privada')),
  extracacao_como text,
  dificuldade_extracao text,
  integracao_automatizada boolean,
  
  -- SEÇÃO 5: REUSO
  potencial_reuso boolean,
  interessados_reuso text[] CHECK (interessados_reuso <@ ARRAY['outra_secretaria_mpo', 'outro_ministerio', 'orgaos_publicos', 'instituicoes_privadas', 'publico_geral']),
  
  -- SEÇÃO 6: GOVERNANÇA
  curador_dados text,
  substituto_curador text,
  data_inventario date,
  periodicidade_revisao text CHECK (periodicidade_revisao IN ('nao', 'mensal', 'bimestral', 'trimestral', 'quadrimestral', 'semestral', 'anual')),
  
  -- DADOS DE CONTEXTUALIZAÇÃO
  nivel_criticidade text CHECK (nivel_criticidade IN ('baixa', 'media', 'alta', 'critica')),
  politica_retencao text CHECK (politica_retencao IN ('sim', 'nao', 'em_elaboracao')),
  local_armazenamento text[] NOT NULL,
  observacoes text
);

-- Criar índices para melhor performance
CREATE INDEX idx_levantamento_status ON public.levantamento_ativos(status);
CREATE INDEX idx_levantamento_created_at ON public.levantamento_ativos(created_at DESC);
CREATE INDEX idx_levantamento_secretaria ON public.levantamento_ativos(secretaria);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_levantamento_ativos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_levantamento_ativos_updated_at ON public.levantamento_ativos;
CREATE TRIGGER trigger_levantamento_ativos_updated_at
BEFORE UPDATE ON public.levantamento_ativos
FOR EACH ROW
EXECUTE FUNCTION public.update_levantamento_ativos_updated_at();

-- Habilitar RLS
ALTER TABLE public.levantamento_ativos ENABLE ROW LEVEL SECURITY;

-- Política de SELECT (qualquer usuário autenticado pode ler)
DROP POLICY IF EXISTS "levantamento_select_policy" ON public.levantamento_ativos;
CREATE POLICY levantamento_select_policy ON public.levantamento_ativos
  FOR SELECT
  USING (auth.role() = 'authenticated_user');

-- Política de INSERT (qualquer usuário autenticado pode inserir)
DROP POLICY IF EXISTS "levantamento_insert_policy" ON public.levantamento_ativos;
CREATE POLICY levantamento_insert_policy ON public.levantamento_ativos
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated_user');

-- Política de UPDATE (qualquer usuário autenticado pode atualizar)
DROP POLICY IF EXISTS "levantamento_update_policy" ON public.levantamento_ativos;
CREATE POLICY levantamento_update_policy ON public.levantamento_ativos
  FOR UPDATE
  USING (auth.role() = 'authenticated_user');

-- Comentário sobre a tabela
COMMENT ON TABLE public.levantamento_ativos IS 'Tabela para armazenar respostas do levantamento de ativos de dados';
