import type { SistemaForm } from "@/types/dashboard";
import { UI_CLASSES, COLORS } from "@/lib/ui-constants";
import { SECRETARIAS } from "@/lib/dashboard";

type SistemasFormProps = {
  form: SistemaForm;
  formError: string;
  saving: boolean;
  editingId: string | null;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  setForm: (form: SistemaForm) => void;
};

type FormInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  maxLength?: number;
  className?: string;
};

type FormTextAreaProps = Omit<FormInputProps, "type"> & {
  rows?: number;
};

// Componente reutilizável para inputs
function FormInput({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = "text",
  maxLength,
  className,
}: FormInputProps) {
  return (
    <div>
      <label className={UI_CLASSES.label}>
        {label} {required && <span className={UI_CLASSES.textRequired}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        className={className || UI_CLASSES.input}
      />
    </div>
  );
}

// Componente reutilizável para textareas
function FormTextArea({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  rows = 2,
}: FormTextAreaProps) {
  return (
    <div>
      <label className={UI_CLASSES.label}>
        {label} {required && <span className={UI_CLASSES.textRequired}>*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`${UI_CLASSES.input} resize-none`}
      />
    </div>
  );
}

export function SistemasForm({
  form,
  formError,
  saving,
  editingId,
  onSubmit,
  onCancel,
  setForm,
}: SistemasFormProps) {
  const handleChange = (field: keyof SistemaForm, value: string) => {
    setForm({ ...form, [field]: value });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
      {formError && (
        <div className={UI_CLASSES.formError}>
          {formError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="Sigla"
          value={form.sigla}
          onChange={(val) => handleChange("sigla", val.toUpperCase())}
          placeholder="Ex: POPOI"
          required
          maxLength={100}
        />
        <FormInput
          label="Gestão de Dados"
          value={form.gestao_dados}
          onChange={(val) => handleChange("gestao_dados", val)}
          placeholder="Ex: MGI, MPO"
          required
        />
      </div>

      <FormInput
        label="Nome do Sistema"
        value={form.nome}
        onChange={(val) => handleChange("nome", val)}
        placeholder="Ex: PORTAL DE PAGAMENTOS A ORGANISMOS INTERNACIONAIS"
        required
      />

      <FormTextArea
        label="Descrição"
        value={form.descricao}
        onChange={(val) => handleChange("descricao", val)}
        placeholder="Descreva o propósito e funcionalidades do sistema"
        required
        rows={3}
      />

      <FormInput
        label="Gestores do Sistema"
        value={form.gestores}
        onChange={(val) => handleChange("gestores", val)}
        required
      />

      <FormInput
        label="Sustentação do Sistema"
        value={form.sustentacao}
        onChange={(val) => handleChange("sustentacao", val)}
        placeholder="Ex: FIRST (CONTRATO DO MGI), DESENVOLVIMENTO PRÓPRIO"
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={UI_CLASSES.label}>
            Tipo de Acesso
          </label>
          <select
            value={form.tipo_acesso || "publico"}
            onChange={(e) => handleChange("tipo_acesso", e.target.value)}
            className={UI_CLASSES.input}
          >
            <option value="publico">Público</option>
            <option value="restrito">Restrito</option>
          </select>
        </div>
        <div>
          <label className={UI_CLASSES.label}>
            Secretaria
          </label>
          <select
            value={form.secretaria || ""}
            onChange={(e) => handleChange("secretaria", e.target.value)}
            className={UI_CLASSES.input}
          >
            <option value="">Selecione (opcional)</option>
            {SECRETARIAS.map((secretaria) => (
              <option key={secretaria} value={secretaria}>{secretaria}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="URL Produção"
          value={form.url_producao}
          onChange={(val) => handleChange("url_producao", val)}
          type="url"
        />
        <FormInput
          label="URL Homologação"
          value={form.url_homologacao}
          onChange={(val) => handleChange("url_homologacao", val)}
          type="url"
        />
      </div>

      <FormTextArea
        label="Acesso à Base de Dados"
        value={form.acesso_bd}
        onChange={(val) => handleChange("acesso_bd", val)}
        placeholder="Descreva como acessar os dados (API, SFTP, etc)"
        required
        rows={2}
      />

      {/* Botões */}
      <div className="flex gap-2 justify-end pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className={UI_CLASSES.buttonPrimary}
          style={{ backgroundColor: COLORS.info }}
        >
          {saving ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
        </button>
      </div>
    </form>
  );
}
