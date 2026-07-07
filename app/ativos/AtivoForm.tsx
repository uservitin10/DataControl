"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { Area, Profile, LevantamentoAtivo } from "@/types/levantamento-ativos";

type Props = {
  ativo?: LevantamentoAtivo | null;
  profiles: Profile[];
  areas: Area[];
  action: (formData: FormData) => void;
};

const TIPO_ATIVO_OPTIONS = [
  { value: "Sistema", label: "Sistema" },
  { value: "Processo", label: "Processo" },
  { value: "Dados", label: "Dados" },
  { value: "Infraestrutura", label: "Infraestrutura" },
];

const STATUS_ATIVO_OPTIONS = [
  { value: "em_uso", label: "Em uso" },
  { value: "legado", label: "Legado" },
  { value: "em_desenvolvimento", label: "Em desenvolvimento" },
];

const TECNOLOGIA_ARMAZENAMENTO_OPTIONS = [
  { value: "planilhas", label: "Planilhas" },
  { value: "sql", label: "SQL" },
  { value: "nosql", label: "NoSQL" },
  { value: "nuvem", label: "Nuvem" },
  { value: "sharepoint", label: "SharePoint" },
];

const TIPO_BACKUP_OPTIONS = [
  { value: "nao", label: "Não" },
  { value: "nuvem", label: "Nuvem" },
  { value: "sharepoint", label: "SharePoint" },
  { value: "servidor_interno", label: "Servidor interno" },
];

const FREQUENCIA_ATUALIZACAO_OPTIONS = [
  { value: "diario", label: "Diário" },
  { value: "semanal", label: "Semanal" },
  { value: "mensal", label: "Mensal" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
  { value: "nao_atualiza", label: "Não atualiza" },
];

const NIVEL_SIGILO_OPTIONS = [
  { value: "pessoal", label: "Pessoal" },
  { value: "sigiloso", label: "Sigiloso" },
  { value: "publico", label: "Público" },
];

const NATUREZA_DADOS_OPTIONS = [
  { value: "pessoais", label: "Pessoais" },
  { value: "pessoais_sensiveis", label: "Pessoais sensíveis" },
  { value: "anonimizado", label: "Anonimizado" },
  { value: "nenhuma", label: "Nenhuma" },
];

const NIVEL_ACESSO_OPTIONS = [
  { value: "publico", label: "Público" },
  { value: "restrito", label: "Restrito" },
  { value: "confidencial", label: "Confidencial" },
];

const TIPO_API_OPTIONS = [
  { value: "nao", label: "Não" },
  { value: "publica", label: "Pública" },
  { value: "privada", label: "Privada" },
];

const PERIODICIDADE_REVISAO_OPTIONS = [
  { value: "nao", label: "Não" },
  { value: "mensal", label: "Mensal" },
  { value: "bimestral", label: "Bimestral" },
  { value: "trimestral", label: "Trimestral" },
  { value: "quadrimestral", label: "Quadrimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

function Selecao({
  name,
  defaultValue,
  options,
  placeholder = "Selecione...",
}: {
  name: string;
  defaultValue?: string | null;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className={inputClass}>
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function SelecaoPessoa({
  name,
  defaultValue,
  profiles,
}: {
  name: string;
  defaultValue?: string | null;
  profiles: Profile[];
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className={inputClass}>
      <option value="">Selecione...</option>
      {profiles.map((p) => (
        <option key={p.id} value={p.id}>
          {p.display_name || p.email || "Sem nome"}
        </option>
      ))}
    </select>
  );
}

function SelecaoArea({
  name,
  defaultValue,
  areas,
}: {
  name: string;
  defaultValue?: string | null;
  areas: Area[];
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className={inputClass}>
      <option value="">Selecione...</option>
      {areas.map((a) => (
        <option key={a.id} value={a.id}>
          {a.nome}
        </option>
      ))}
    </select>
  );
}

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
    >
      {pending ? "Salvando..." : "Salvar"}
    </button>
  );
}

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="rounded-lg border border-slate-200 p-5">
      <legend className="px-2 text-sm font-semibold text-slate-900">{titulo}</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function AtivoForm({ ativo, profiles, areas, action }: Props) {
  return (
    <form action={action} className="flex flex-col gap-6">
      <Secao titulo="Identificação">
        <Campo label="Nome do ativo *">
          <input name="nome_ativo" required defaultValue={ativo?.nome_ativo ?? ""} className={inputClass} />
        </Campo>
        <Campo label="Sigla">
          <input name="sigla" defaultValue={ativo?.sigla ?? ""} className={inputClass} />
        </Campo>
        <Campo label="Tipo de ativo">
          <Selecao name="tipo_ativo" defaultValue={ativo?.tipo_ativo} options={TIPO_ATIVO_OPTIONS} />
        </Campo>
        <Campo label="Status do ativo">
          <Selecao name="status_ativo" defaultValue={ativo?.status_ativo} options={STATUS_ATIVO_OPTIONS} />
        </Campo>
        <Campo label="Finalidade">
          <textarea name="finalidade" rows={2} defaultValue={ativo?.finalidade ?? ""} className={inputClass} />
        </Campo>
        <Campo label="Uso do ativo">
          <textarea name="uso_ativo" rows={2} defaultValue={ativo?.uso_ativo ?? ""} className={inputClass} />
        </Campo>
      </Secao>

      <Secao titulo="Responsáveis e organização">
        <Campo label="Secretaria">
          <SelecaoArea name="secretaria_id" defaultValue={ativo?.secretaria_id} areas={areas} />
        </Campo>
        <Campo label="Unidade responsável">
          <SelecaoArea name="unidade_responsavel_id" defaultValue={ativo?.unidade_responsavel_id} areas={areas} />
        </Campo>
        <Campo label="Responsável de negócio">
          <SelecaoPessoa name="responsavel_negocio_id" defaultValue={ativo?.responsavel_negocio_id} profiles={profiles} />
        </Campo>
        <Campo label="Responsável técnico">
          <SelecaoPessoa name="responsavel_tecnico_id" defaultValue={ativo?.responsavel_tecnico_id} profiles={profiles} />
        </Campo>
        <Campo label="Curador dos dados">
          <SelecaoPessoa name="curador_dados_id" defaultValue={ativo?.curador_dados_id} profiles={profiles} />
        </Campo>
        <Campo label="Substituto do curador">
          <SelecaoPessoa name="substituto_curador_id" defaultValue={ativo?.substituto_curador_id} profiles={profiles} />
        </Campo>
        <Campo label="Criado por">
          <SelecaoPessoa name="criado_por" defaultValue={ativo?.criado_por} profiles={profiles} />
        </Campo>
      </Secao>

      <Secao titulo="Armazenamento e backup">
        <Campo label="Tecnologia de armazenamento">
          <Selecao name="tecnologia_armazenamento" defaultValue={ativo?.tecnologia_armazenamento} options={TECNOLOGIA_ARMAZENAMENTO_OPTIONS} />
        </Campo>
        <Campo label="Tipo de backup">
          <Selecao name="tipo_backup" defaultValue={ativo?.tipo_backup} options={TIPO_BACKUP_OPTIONS} />
        </Campo>
        <Campo label="Volume de dados">
          <input name="volume_dados" defaultValue={ativo?.volume_dados ?? ""} className={inputClass} />
        </Campo>
        <Campo label="Frequência de atualização">
          <Selecao name="frequencia_atualizacao" defaultValue={ativo?.frequencia_atualizacao} options={FREQUENCIA_ATUALIZACAO_OPTIONS} />
        </Campo>
        <Campo label="Crescimento por atualização">
          <input name="crescimento_por_atualizacao" defaultValue={ativo?.crescimento_por_atualizacao ?? ""} className={inputClass} />
        </Campo>
        <Campo label="Linguagem de programação">
          <input name="linguagem_programacao" defaultValue={ativo?.linguagem_programacao ?? ""} className={inputClass} />
        </Campo>
      </Secao>

      <Secao titulo="Classificação de dados">
        <Campo label="Nível de sigilo">
          <Selecao name="nivel_sigilo" defaultValue={ativo?.nivel_sigilo} options={NIVEL_SIGILO_OPTIONS} />
        </Campo>
        <Campo label="Natureza dos dados">
          <Selecao name="natureza_dados" defaultValue={ativo?.natureza_dados} options={NATUREZA_DADOS_OPTIONS} />
        </Campo>
        <Campo label="Nível de acesso">
          <Selecao name="nivel_acesso" defaultValue={ativo?.nivel_acesso} options={NIVEL_ACESSO_OPTIONS} />
        </Campo>
        <Campo label="Norma específica">
          <input name="norma_especifica" defaultValue={ativo?.norma_especifica ?? ""} className={inputClass} />
        </Campo>
        <Campo label="Risco percebido">
          <input name="risco_percebido" defaultValue={ativo?.risco_percebido ?? ""} className={inputClass} />
        </Campo>
        <Campo label="Termo de responsabilidade">
          <input name="termo_responsabilidade" defaultValue={ativo?.termo_responsabilidade ?? ""} className={inputClass} />
        </Campo>
        <Campo label="Observação jurídica">
          <input name="observacao_juridica" defaultValue={ativo?.observacao_juridica ?? ""} className={inputClass} />
        </Campo>
      </Secao>

      <Secao titulo="API e extração">
        <Campo label="Tipo de API">
          <Selecao name="tipo_api" defaultValue={ativo?.tipo_api} options={TIPO_API_OPTIONS} />
        </Campo>
        <Campo label="Como é a extração">
          <input name="como_extracao" defaultValue={ativo?.como_extracao ?? ""} className={inputClass} />
        </Campo>
        <Campo label="Dificuldade de extração">
          <input name="dificuldade_extracao" defaultValue={ativo?.dificuldade_extracao ?? ""} className={inputClass} />
        </Campo>
        <Campo label="Integração automatizada">
          <input name="integracao_automatizada" defaultValue={ativo?.integracao_automatizada ?? ""} className={inputClass} />
        </Campo>
      </Secao>

      <Secao titulo="Potencial de reuso">
        <Campo label="Potencial de reuso">
          <input name="potencial_reuso" defaultValue={ativo?.potencial_reuso ?? ""} className={inputClass} />
        </Campo>
        <Campo label="Possíveis interessados">
          <input name="possiveis_interessados" defaultValue={ativo?.possiveis_interessados ?? ""} className={inputClass} />
        </Campo>
      </Secao>

      <Secao titulo="Inventário e revisão">
        <Campo label="Data do inventário">
          <input name="data_inventario" type="date" defaultValue={ativo?.data_inventario ?? ""} className={inputClass} />
        </Campo>
        <Campo label="Periodicidade de revisão">
          <Selecao name="periodicidade_revisao" defaultValue={ativo?.periodicidade_revisao} options={PERIODICIDADE_REVISAO_OPTIONS} />
        </Campo>
      </Secao>

      <div className="flex items-center gap-3">
        <BotaoSalvar />
        <a href="/ativos" className="text-sm font-medium text-slate-600 hover:underline">
          Cancelar
        </a>
      </div>
    </form>
  );
}
