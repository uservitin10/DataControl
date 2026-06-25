"use client";

import { useState, type ChangeEvent, type ChangeEventHandler } from "react";
import { postJson, patchJson } from "@/lib/api";
import type { RespostaLevantamento, RespostaLevantamentoInsert } from "@/types/levantamento";

type FormularioLevantamentoProps = {
  respostaExistente?: RespostaLevantamento | null;
  onSucesso?: () => void;
};

const TIPOS_ATIVO = ["Banco de dados", "Sistema corporativo", "Planilha", "Dashboard", "Data Lake", "Outro"];
const VOLUMES_ESTIMADOS = ["Menos de 1.000", "1.000–10.000", "10.000–100.000", "Acima de 100.000"];
const LOCAIS_ARMAZENAMENTO = ["Servidor local", "Nuvem", "Planilha/drive", "Sistema interno", "E-mail", "Outro"];
const NIVEIS_ACESSO = ["Apenas o setor", "Outros setores internos", "Fornecedores externos", "Clientes"];
const NIVEIS_CRITICIDADE = ["Baixa", "Média", "Alta", "Crítica"];
const POLITICAS_RETENCAO = ["Sim", "Não", "Em elaboração"];
const STATUS_ATIVO = ["Em uso", "Legado", "Em Desenvolvimento"];
const USO_ATIVO = ["Operacional", "Gerencial", "Estratégico"];
const TECNOLOGIA_ARMAZENAMENTO = ["Planilhas", "Banco de dados SQL", "Banco de dados NoSQL", "Nuvem", "SharePoint"];
const POSSUI_BACKUP = ["Não", "Nuvem", "SharePoint", "Servidor interno"];
const FREQUENCIA_ATUALIZACAO = ["Diário", "Semanal", "Mensal", "Semestral", "Anual", "Não atualiza"];
const NIVEL_SIGILO = ["Pessoal", "Sigiloso", "Público"];
const NATUREZA_DADOS = ["Pessoais", "Pessoais sensíveis", "Anonimizado", "Nenhuma"];
const EXISTE_API = ["Não", "Pública", "Privada"];
const INTERESSADOS_REUSO = ["Outra secretaria do MPO", "Outro ministério", "Órgãos públicos", "Instituições privadas", "Público em geral"];
const PERIODICIDADE_REVISAO = ["Não", "Mensal", "Bimestral", "Trimestral", "Quadrimestral", "Semestral", "Anual"];

export function FormularioLevantamento({ respostaExistente, onSucesso }: FormularioLevantamentoProps) {
  const [formData, setFormData] = useState<RespostaLevantamentoInsert>({
    nome_respondente: respostaExistente?.nome_respondente || "",
    secretaria: respostaExistente?.secretaria || "",
    unidade_responsavel: respostaExistente?.unidade_responsavel || "",
    cargo: respostaExistente?.cargo || "",
    nome_ativo: respostaExistente?.nome_ativo || "",
    tipo_ativo: respostaExistente?.tipo_ativo || [],
    sigla_abreviacao: respostaExistente?.sigla_abreviacao || "",
    finalidade_funcao: respostaExistente?.finalidade_funcao || "",
    responsavel_negocio: respostaExistente?.responsavel_negocio || "",
    responsavel_tecnico: respostaExistente?.responsavel_tecnico || "",
    status_ativo: respostaExistente?.status_ativo,
    uso_ativo: respostaExistente?.uso_ativo || [],
    tecnologia_armazenamento: respostaExistente?.tecnologia_armazenamento,
    possui_backup: respostaExistente?.possui_backup,
    volume_dados_atual: respostaExistente?.volume_dados_atual || "",
    frequencia_atualizacao: respostaExistente?.frequencia_atualizacao,
    crescimento_estimado: respostaExistente?.crescimento_estimado || "",
    linguagem_programacao: respostaExistente?.linguagem_programacao || "",
    nivel_sigilo: respostaExistente?.nivel_sigilo,
    natureza_dados: respostaExistente?.natureza_dados,
    nivel_acesso: respostaExistente?.nivel_acesso || [],
    norma_especifica: respostaExistente?.norma_especifica || "",
    risco_percebido: respostaExistente?.risco_percebido || "",
    necessita_termo_responsabilidade: respostaExistente?.necessita_termo_responsabilidade || false,
    observacao_juridica: respostaExistente?.observacao_juridica || "",
    existe_api: respostaExistente?.existe_api,
    extracacao_como: respostaExistente?.extracacao_como || "",
    dificuldade_extracao: respostaExistente?.dificuldade_extracao || "",
    integracao_automatizada: respostaExistente?.integracao_automatizada || false,
    potencial_reuso: respostaExistente?.potencial_reuso || false,
    interessados_reuso: respostaExistente?.interessados_reuso || [],
    curador_dados: respostaExistente?.curador_dados || "",
    substituto_curador: respostaExistente?.substituto_curador || "",
    data_inventario: respostaExistente?.data_inventario || "",
    periodicidade_revisao: respostaExistente?.periodicidade_revisao,
    nivel_criticidade: respostaExistente?.nivel_criticidade || "media",
    politica_retencao: respostaExistente?.politica_retencao || "nao",
    local_armazenamento: respostaExistente?.local_armazenamento || [],
    observacoes: respostaExistente?.observacoes || "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (field: keyof RespostaLevantamentoInsert, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleInputEvent = (
    field: keyof RespostaLevantamentoInsert,
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleCheckboxChange = (field: keyof RespostaLevantamentoInsert, value: boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleChip = (field: "tipo_ativo" | "local_armazenamento" | "nivel_acesso" | "uso_ativo" | "interessados_reuso", value: string) => {
    setFormData((prev) => {
      const current = prev[field] as string[];
      const isSelected = current.includes(value);
      return {
        ...prev,
        [field]: isSelected ? current.filter((v) => v !== value) : [...current, value],
      };
    });
  };

  const handleChipSelect = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value as any }));
  };

  const validarFormulario = (): boolean => {
    if (!formData.nome_respondente.trim()) {
      setError("Nome do respondente é obrigatório");
      return false;
    }
    if (!formData.secretaria.trim()) {
      setError("Secretaria é obrigatória");
      return false;
    }
    if (!formData.unidade_responsavel.trim()) {
      setError("Unidade responsável é obrigatória");
      return false;
    }
    if (!formData.nome_ativo.trim()) {
      setError("Nome do ativo é obrigatório");
      return false;
    }
    if (formData.tipo_ativo.length === 0) {
      setError("Selecione pelo menos um tipo de ativo");
      return false;
    }
    if (!formData.finalidade_funcao.trim()) {
      setError("Finalidade/Função do ativo é obrigatória");
      return false;
    }
    if (!formData.responsavel_negocio.trim()) {
      setError("Responsável de negócio é obrigatório");
      return false;
    }
    if (formData.nivel_acesso.length === 0) {
      setError("Selecione pelo menos um nível de acesso");
      return false;
    }
    setError(null);
    return true;
  };

  const enviarResposta = async (status: "concluido" | "rascunho") => {
    if (!validarFormulario()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = { ...formData, status };

      if (respostaExistente?.id) {
        await patchJson(`/api/levantamento/${respostaExistente.id}`, payload);
        setSuccess(status === "concluido" ? "Resposta enviada com sucesso!" : "Rascunho salvo com sucesso!");
      } else {
        await postJson("/api/levantamento", payload);
        setSuccess(status === "concluido" ? "Resposta enviada com sucesso!" : "Rascunho salvo com sucesso!");
      }

      onSucesso?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* INFORMAÇÕES DO RESPONDENTE */}
      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6">
        <h3 className="text-[10px] uppercase tracking-widest text-[#a0aec0] font-medium mb-6">
          Identificação do respondente
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Nome do respondente" required value={formData.nome_respondente} onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputEvent("nome_respondente", e)} />
          <InputField label="Secretaria" required value={formData.secretaria} onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputEvent("secretaria", e)} />
          <InputField label="Unidade responsável" required value={formData.unidade_responsavel} onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputEvent("unidade_responsavel", e)} />
          <InputField label="Cargo" optional value={formData.cargo} onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputEvent("cargo", e)} />
        </div>
      </section>

      {/* SEÇÃO 1: IDENTIFICAÇÃO DO ATIVO */}
      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6">
        <h3 className="text-[10px] uppercase tracking-widest text-[#a0aec0] font-medium mb-6">
          Seção 1: Identificação do Ativo
        </h3>

        <div className="space-y-6">
          <InputField label="Nome do ativo de dados" required value={formData.nome_ativo} onChange={(e) => handleInputChange("nome_ativo", e.target.value)} />
          <InputField label="Sigla/abreviação" optional value={formData.sigla_abreviacao} onChange={(e) => handleInputChange("sigla_abreviacao", e.target.value)} />
          <InputField label="Finalidade/Função do ativo" required value={formData.finalidade_funcao} onChange={(e) => handleInputChange("finalidade_funcao", e.target.value)} />
          <InputField label="Responsável de negócio" required value={formData.responsavel_negocio} onChange={(e) => handleInputChange("responsavel_negocio", e.target.value)} />
          <InputField label="Responsável técnico" optional value={formData.responsavel_tecnico} onChange={(e) => handleInputChange("responsavel_tecnico", e.target.value)} />
          
          <ChipsGroup label="Tipo de ativo" required options={TIPOS_ATIVO} selected={formData.tipo_ativo} onChange={(v) => toggleChip("tipo_ativo", v)} />
          <SelectField label="Status do ativo" optional value={formData.status_ativo || ""} options={STATUS_ATIVO} onChange={(e) => handleChipSelect("status_ativo", e.target.value)} />
        </div>
      </section>

      {/* SEÇÃO 2: CARACTERÍSTICAS TÉCNICAS */}
      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6">
        <h3 className="text-[10px] uppercase tracking-widest text-[#a0aec0] font-medium mb-6">
          Seção 2: Características Técnicas
        </h3>

        <div className="space-y-6">
          <ChipsGroup label="Uso do ativo" optional options={USO_ATIVO} selected={formData.uso_ativo || []} onChange={(v) => toggleChip("uso_ativo", v)} />
          <SelectField label="Tecnologia para armazenamento dos dados" optional value={formData.tecnologia_armazenamento || ""} options={TECNOLOGIA_ARMAZENAMENTO} onChange={(e) => handleChipSelect("tecnologia_armazenamento", e.target.value)} />
          <SelectField label="Possui backup?" optional value={formData.possui_backup || ""} options={POSSUI_BACKUP} onChange={(e) => handleChipSelect("possui_backup", e.target.value)} />
          <InputField label="Volume de dados do ativo atual" optional value={formData.volume_dados_atual} onChange={(e) => handleInputChange("volume_dados_atual", e.target.value)} placeholder="Ex: 50 GB" />
          <SelectField label="Frequência de atualização" optional value={formData.frequencia_atualizacao || ""} options={FREQUENCIA_ATUALIZACAO} onChange={(e) => handleChipSelect("frequencia_atualizacao", e.target.value)} />
          <InputField label="Crescimento estimado por atualização" optional value={formData.crescimento_estimado} onChange={(e) => handleInputChange("crescimento_estimado", e.target.value)} placeholder="Ex: 500 MB" />
          <InputField label="Usa alguma linguagem de programação? Qual?" optional value={formData.linguagem_programacao} onChange={(e) => handleInputChange("linguagem_programacao", e.target.value)} />
        </div>
      </section>

      {/* SEÇÃO 3: CATEGORIZAÇÃO DE DADOS */}
      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6">
        <h3 className="text-[10px] uppercase tracking-widest text-[#a0aec0] font-medium mb-6">
          Seção 3: Categorização de Dados
        </h3>

        <div className="space-y-6">
          <SelectField label="Nível de sigilo dos dados" optional value={formData.nivel_sigilo || ""} options={NIVEL_SIGILO} onChange={(e) => handleChipSelect("nivel_sigilo", e.target.value)} />
          <SelectField label="Natureza dos dados" optional value={formData.natureza_dados || ""} options={NATUREZA_DADOS} onChange={(e) => handleChipSelect("natureza_dados", e.target.value)} />
          <ChipsGroup label="Nível de acesso" required options={["Público", "Interno", "Restrito"]} selected={formData.nivel_acesso} onChange={(v) => toggleChip("nivel_acesso", v)} />
          <InputField label="Possui alguma norma específica sobre o dado utilizado?" optional value={formData.norma_especifica} onChange={(e) => handleInputChange("norma_especifica", e.target.value)} placeholder="Ex: Leis, portarias, determinações" />
          <TextAreaField label="Risco percebido?" optional value={formData.risco_percebido} onChange={(e) => handleInputChange("risco_percebido", e.target.value)} placeholder="Ex: Falta de capacidade de armazenamento, Lentidão..." />
          <CheckboxField label="Necessita termo de responsabilidade para uso do ativo?" checked={formData.necessita_termo_responsabilidade} onChange={(v) => handleCheckboxChange("necessita_termo_responsabilidade", v)} />
          <InputField label="Alguma observação jurídica sobre o ativo?" optional value={formData.observacao_juridica} onChange={(e) => handleInputChange("observacao_juridica", e.target.value)} />
        </div>
      </section>

      {/* SEÇÃO 4: INTEGRAÇÃO */}
      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6">
        <h3 className="text-[10px] uppercase tracking-widest text-[#a0aec0] font-medium mb-6">
          Seção 4: Integração
        </h3>

        <div className="space-y-6">
          <SelectField label="Existe API?" optional value={formData.existe_api || ""} options={EXISTE_API} onChange={(e) => handleChipSelect("existe_api", e.target.value)} />
          <InputField label="Como é feita a extração?" optional value={formData.extracacao_como} onChange={(e) => handleInputChange("extracacao_como", e.target.value)} />
          <InputField label="Qual a dificuldade da extração?" optional value={formData.dificuldade_extracao} onChange={(e) => handleInputChange("dificuldade_extracao", e.target.value)} />
          <CheckboxField label="Integração Automatizada?" checked={formData.integracao_automatizada} onChange={(v) => handleCheckboxChange("integracao_automatizada", v)} />
        </div>
      </section>

      {/* SEÇÃO 5: REUSO */}
      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6">
        <h3 className="text-[10px] uppercase tracking-widest text-[#a0aec0] font-medium mb-6">
          Seção 5: Reuso
        </h3>

        <div className="space-y-6">
          <CheckboxField label="Potencial de Reuso?" checked={formData.potencial_reuso} onChange={(v) => handleCheckboxChange("potencial_reuso", v)} />
          <ChipsGroup label="Possíveis interessados no reuso" optional options={INTERESSADOS_REUSO} selected={formData.interessados_reuso || []} onChange={(v) => toggleChip("interessados_reuso", v)} />
        </div>
      </section>

      {/* SEÇÃO 6: GOVERNANÇA */}
      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6">
        <h3 className="text-[10px] uppercase tracking-widest text-[#a0aec0] font-medium mb-6">
          Seção 6: Governança
        </h3>

        <div className="space-y-6">
          <InputField label="Curador de dados" optional value={formData.curador_dados} onChange={(e) => handleInputChange("curador_dados", e.target.value)} />
          <InputField label="Substituto do curador de dados" optional value={formData.substituto_curador} onChange={(e) => handleInputChange("substituto_curador", e.target.value)} />
          <InputField label="Data do inventário do ativo" optional type="date" value={formData.data_inventario} onChange={(e) => handleInputChange("data_inventario", e.target.value)} />
          <SelectField label="Periodicidade de revisão" optional value={formData.periodicidade_revisao || ""} options={PERIODICIDADE_REVISAO} onChange={(e) => handleChipSelect("periodicidade_revisao", e.target.value)} />
        </div>
      </section>

      {/* RESUMO FINAL */}
      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6">
        <h3 className="text-[10px] uppercase tracking-widest text-[#a0aec0] font-medium mb-6">
          Resumo Final
        </h3>

        <div className="space-y-6">
          <ChipsGroup label="Nível de criticidade" optional options={NIVEIS_CRITICIDADE} selected={[formData.nivel_criticidade]} onChange={(v) => handleChipSelect("nivel_criticidade", v.toLowerCase())} />
          <ChipsGroup label="Política de retenção" optional options={POLITICAS_RETENCAO} selected={formData.politica_retencao === "sim" ? ["Sim"] : formData.politica_retencao === "nao" ? ["Não"] : ["Em elaboração"]} onChange={(v) => {
            const mapping = { "Sim": "sim", "Não": "nao", "Em elaboração": "em_elaboracao" };
            handleChipSelect("politica_retencao", mapping[v as keyof typeof mapping]);
          }} />
          <ChipsGroup label="Local de armazenamento" required options={LOCAIS_ARMAZENAMENTO} selected={formData.local_armazenamento} onChange={(v) => toggleChip("local_armazenamento", v)} />
          <TextAreaField label="Observações" optional value={formData.observacoes} onChange={(e) => handleInputChange("observacoes", e.target.value)} />
        </div>
      </section>

      {/* Mensagens */}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4"><p className="text-sm text-red-700">{error}</p></div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 p-4"><p className="text-sm text-green-700">{success}</p></div>}

      {/* Botões */}
      <div className="flex gap-4 pt-4">
        <button type="button" onClick={() => enviarResposta("rascunho")} disabled={loading} className="border border-[#d1d9e0] text-[#4a5568] rounded-lg px-5 py-2 text-sm hover:bg-[#f7fafc] disabled:opacity-50 transition">
          {loading ? "Salvando..." : "Salvar rascunho"}
        </button>
        <button type="button" onClick={() => enviarResposta("concluido")} disabled={loading} className="bg-[#2d4a6b] text-white rounded-lg px-5 py-2 text-sm hover:bg-[#243d5a] disabled:opacity-50 transition">
          {loading ? "Enviando..." : "Enviar resposta"}
        </button>
      </div>
    </div>
  );
}

// Componentes auxiliares
type InputFieldProps = {
  label: string;
  required?: boolean;
  optional?: boolean;
  value?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  type?: string;
  placeholder?: string;
};

function InputField({ label, required, optional, value, onChange, type = "text", placeholder }: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1a202c] mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input type={type} value={value ?? ""} onChange={onChange} className="w-full border border-[#d1d9e0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2d4a6b] focus:ring-1 focus:ring-[#2d4a6b]" placeholder={placeholder} />
    </div>
  );
}

type TextAreaFieldProps = {
  label: string;
  optional?: boolean;
  value?: string;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
  placeholder?: string;
};

function TextAreaField({ label, optional, value, onChange, placeholder }: TextAreaFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1a202c] mb-2">{label}</label>
      <textarea value={value ?? ""} onChange={onChange} className="w-full border border-[#d1d9e0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2d4a6b] focus:ring-1 focus:ring-[#2d4a6b] min-h-[100px]" placeholder={placeholder} />
    </div>
  );
}

type SelectFieldProps = {
  label: string;
  optional?: boolean;
  value?: string;
  options: string[];
  onChange: ChangeEventHandler<HTMLSelectElement>;
};

function SelectField({ label, optional, value, options, onChange }: SelectFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1a202c] mb-2">{label}</label>
      <select value={value ?? ""} onChange={onChange} className="w-full border border-[#d1d9e0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2d4a6b] focus:ring-1 focus:ring-[#2d4a6b]">
        <option value="">Selecione...</option>
        {options.map((opt: string) => {
          const valueMap: { [key: string]: string } = {
            "Sim": "sim",
            "Não": "nao",
            "Em uso": "em_uso",
            "Legado": "legado",
            "Em Desenvolvimento": "em_desenvolvimento",
          };
          return (
            <option key={opt} value={valueMap[opt] || opt.toLowerCase().replace(/\s+/g, "_")}>{opt}</option>
          );
        })}
      </select>
    </div>
  );
}

type ChipsGroupProps = {
  label: string;
  required?: boolean;
  optional?: boolean;
  options: string[];
  selected: string[];
  onChange: (value: string) => void;
};

function ChipsGroup({ label, required, optional, options, selected, onChange }: ChipsGroupProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1a202c] mb-3">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt: string) => (
          <button key={opt} type="button" onClick={() => onChange(opt)} className={`px-3 py-2 rounded-lg text-sm border transition-colors ${selected.includes(opt) ? "border-[#2d4a6b] bg-[#eaf0f7] text-[#2d4a6b]" : "border-[#d1d9e0] bg-white text-[#4a5568] hover:bg-[#f7fafc]"}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

type CheckboxFieldProps = {
  label: string;
  checked?: boolean;
  onChange: (checked: boolean) => void;
};

function CheckboxField({ label, checked = false, onChange }: CheckboxFieldProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 border-[#d1d9e0] rounded accent-[#2d4a6b]" />
      <span className="text-sm font-medium text-[#1a202c]">{label}</span>
    </label>
  );
}
