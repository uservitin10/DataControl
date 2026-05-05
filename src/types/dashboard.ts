export type Registro = {
  id?: string;
  nome: string;
  categoria: string;
  link?: string;
  descricao: string;
  arquivo_path?: string;
  preview_path?: string;
  criado_por?: string;
  created_at?: string;
  updated_at?: string;
  tipo_acesso?: string;
  responsavel?: string;
  desenvolvedor?: string;
  fonte_dados?: string;
  dados_sensiveis?: boolean;
  secretaria?: string;
};

export type Notificacao = {
  id: string;
  tipo: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
};

export type Role = "admin" | "editor" | "viewer";
export type View = "categorias" | "documentos";

export type DashboardForm = {
  nome: string;
  categoria: string;
  link: string;
  descricao: string;
  tipo_acesso: string;
  responsavel: string;
  desenvolvedor: string;
  fonte_dados: string;
  dados_sensiveis: boolean;
  secretaria: string;
};
