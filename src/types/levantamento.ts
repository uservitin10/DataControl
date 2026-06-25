export type StatusLevantamento = "pendente" | "rascunho" | "concluido";
export type NivelCriticidade = "baixa" | "media" | "alta" | "critica";
export type PoliticaRetencao = "sim" | "nao" | "em_elaboracao";
export type StatusAtivo = "em_uso" | "legado" | "em_desenvolvimento";
export type TecnologiaArmazenamento = "planilhas" | "sql" | "nosql" | "nuvem" | "sharepoint";
export type PossuiBackup = "nao" | "nuvem" | "sharepoint" | "servidor_interno";
export type FrequenciaAtualizacao = "diario" | "semanal" | "mensal" | "semestral" | "anual" | "nao_atualiza";
export type NivelSigilo = "pessoal" | "sigiloso" | "publico";
export type NaturezaDados = "pessoais" | "pessoais_sensiveis" | "anonimizado" | "nenhuma";
export type ExisteAPI = "nao" | "publica" | "privada";
export type PeriodicidadeRevisao = "nao" | "mensal" | "bimestral" | "trimestral" | "quadrimestral" | "semestral" | "anual";

export interface RespostaLevantamento {
  id: string;
  created_at: string;
  updated_at: string;
  status: StatusLevantamento;
  
  // Respondente
  nome_respondente: string;
  secretaria: string;
  unidade_responsavel: string;
  cargo?: string;
  
  // Seção 1: Identificação
  nome_ativo: string;
  tipo_ativo: string[];
  sigla_abreviacao?: string;
  finalidade_funcao: string;
  responsavel_negocio: string;
  responsavel_tecnico?: string;
  status_ativo?: StatusAtivo;
  
  // Seção 2: Características Técnicas
  uso_ativo?: string[];
  tecnologia_armazenamento?: TecnologiaArmazenamento;
  possui_backup?: PossuiBackup;
  volume_dados_atual?: string;
  frequencia_atualizacao?: FrequenciaAtualizacao;
  crescimento_estimado?: string;
  linguagem_programacao?: string;
  
  // Seção 3: Categorização
  nivel_sigilo?: NivelSigilo;
  natureza_dados?: NaturezaDados;
  nivel_acesso: string[];
  norma_especifica?: string;
  risco_percebido?: string;
  necessita_termo_responsabilidade?: boolean;
  observacao_juridica?: string;
  
  // Seção 4: Integração
  existe_api?: ExisteAPI;
  extracacao_como?: string;
  dificuldade_extracao?: string;
  integracao_automatizada?: boolean;
  
  // Seção 5: Reuso
  potencial_reuso?: boolean;
  interessados_reuso?: string[];
  
  // Seção 6: Governança
  curador_dados?: string;
  substituto_curador?: string;
  data_inventario?: string;
  periodicidade_revisao?: PeriodicidadeRevisao;
  
  // Contextualização
  nivel_criticidade: NivelCriticidade;
  politica_retencao: PoliticaRetencao;
  local_armazenamento: string[];
  observacoes?: string;
}

export interface RespostaLevantamentoInsert {
  status?: StatusLevantamento;
  
  // Respondente
  nome_respondente: string;
  secretaria: string;
  unidade_responsavel: string;
  cargo?: string;
  
  // Seção 1: Identificação
  nome_ativo: string;
  tipo_ativo: string[];
  sigla_abreviacao?: string;
  finalidade_funcao: string;
  responsavel_negocio: string;
  responsavel_tecnico?: string;
  status_ativo?: StatusAtivo;
  
  // Seção 2: Características Técnicas
  uso_ativo?: string[];
  tecnologia_armazenamento?: TecnologiaArmazenamento;
  possui_backup?: PossuiBackup;
  volume_dados_atual?: string;
  frequencia_atualizacao?: FrequenciaAtualizacao;
  crescimento_estimado?: string;
  linguagem_programacao?: string;
  
  // Seção 3: Categorização
  nivel_sigilo?: NivelSigilo;
  natureza_dados?: NaturezaDados;
  nivel_acesso: string[];
  norma_especifica?: string;
  risco_percebido?: string;
  necessita_termo_responsabilidade?: boolean;
  observacao_juridica?: string;
  
  // Seção 4: Integração
  existe_api?: ExisteAPI;
  extracacao_como?: string;
  dificuldade_extracao?: string;
  integracao_automatizada?: boolean;
  
  // Seção 5: Reuso
  potencial_reuso?: boolean;
  interessados_reuso?: string[];
  
  // Seção 6: Governança
  curador_dados?: string;
  substituto_curador?: string;
  data_inventario?: string;
  periodicidade_revisao?: PeriodicidadeRevisao;
  
  // Contextualização
  nivel_criticidade: NivelCriticidade;
  politica_retencao: PoliticaRetencao;
  local_armazenamento: string[];
  observacoes?: string;
}

export interface EstatisticasLevantamento {
  total_respostas: number;
  setores_respondentes: number;
  pendentes: number;
  concluidos: number;
  rascunhos: number;
}
