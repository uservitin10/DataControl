export interface LevantamentoAtivo {
  id: string;
  created_at?: string;
  updated_at?: string;
  nome_ativo: string;
  sigla?: string | null;
  tipo_ativo?: string | null;
  finalidade?: string | null;
  status_ativo?: string | null;
  nivel_acesso?: string | null;
  uso_ativo?: string | null;
  secretaria_id?: string | null;
  unidade_responsavel_id?: string | null;
  responsavel_negocio_id?: string | null;
  responsavel_tecnico_id?: string | null;
  curador_dados_id?: string | null;
  substituto_curador_id?: string | null;
  criado_por?: string | null;
  tecnologia_armazenamento?: string | null;
  tipo_backup?: string | null;
  volume_dados?: string | null;
  frequencia_atualizacao?: string | null;
  crescimento_por_atualizacao?: string | null;
  linguagem_programacao?: string | null;
  nivel_sigilo?: string | null;
  natureza_dados?: string | null;
  norma_especifica?: string | null;
  risco_percebido?: string | null;
  termo_responsabilidade?: string | null;
  observacao_juridica?: string | null;
  tipo_api?: string | null;
  como_extracao?: string | null;
  dificuldade_extracao?: string | null;
  integracao_automatizada?: string | null;
  potencial_reuso?: string | null;
  possiveis_interessados?: string | null;
  data_inventario?: string | null;
  periodicidade_revisao?: string | null;
}

export type LevantamentoAtivoInput = Partial<Omit<LevantamentoAtivo, "id" | "created_at" | "updated_at">>;

export interface Profile {
  id: string;
  display_name?: string | null;
  email?: string | null;
}

export interface Area {
  id: string;
  nome: string;
}
