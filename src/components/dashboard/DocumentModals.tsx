import type { Dispatch, SetStateAction, ReactNode } from "react";
import type { DashboardForm } from "@/src/types/dashboard";
import { AREAS, SECRETARIAS } from "@/src/lib/dashboard";
import { PREVIEW_ACCEPT, DOCUMENT_ACCEPT } from "@/src/lib/storage";
import { COLORS, UI_CLASSES } from "@/src/lib/ui-constants";

type DocumentFormModalProps = {
  editingId: string | null;
  form: DashboardForm;
  setForm: Dispatch<SetStateAction<DashboardForm>>;
  setArquivo: Dispatch<SetStateAction<File | null>>;
  setPreview: Dispatch<SetStateAction<File | null>>;
  arquivoFileName?: string;
  previewFileName?: string;
  formError: string;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
};

type DocumentViewerModalProps = {
  viewingUrl: string;
  downloadUrl: string | null;
  viewingNome: string;
  onClose: () => void;
};

type FormFieldProps = {
  label: string;
  required?: boolean;
  helpText?: string;
  children: ReactNode;
};

// Reusable form field component
function FormField({ label, required = false, helpText, children }: FormFieldProps) {
  return (
    <div>
      <label className={UI_CLASSES.labelSlate}>
        {label} {required && "*"}
      </label>
      {children}
      {helpText && <p className={UI_CLASSES.textHelpText}>{helpText}</p>}
    </div>
  );
}

export function DocumentFormModal({
  editingId,
  form,
  setForm,
  setArquivo,
  setPreview,
  arquivoFileName,
  previewFileName,
  formError,
  saving,
  onClose,
  onSave,
}: DocumentFormModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-medium" style={{ color: COLORS.primary }}>
          {editingId ? "Editar Painel" : "Novo Painel"}
        </h2>

        <div className="space-y-4">
          <FormField label="Nome" required>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className={UI_CLASSES.inputSlate}
              placeholder="Nome do painel"
            />
          </FormField>

          <FormField label="Área" required>
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              className={UI_CLASSES.inputSlate}
            >
              {AREAS.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tipo de Acesso">
              <select
                value={form.tipo_acesso}
                onChange={(e) => setForm({ ...form, tipo_acesso: e.target.value })}
                className={UI_CLASSES.inputSlate}
              >
                <option value="publico">Público</option>
                <option value="restrito">Restrito</option>
              </select>
            </FormField>
            <FormField label="Secretaria">
              <select
                value={form.secretaria}
                onChange={(e) => setForm({ ...form, secretaria: e.target.value })}
                className={UI_CLASSES.inputSlate}
              >
                <option value="">Selecione (opcional)</option>
                {SECRETARIAS.map((secretaria) => (
                  <option key={secretaria} value={secretaria}>{secretaria}</option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Responsável">
              <input
                type="text"
                value={form.responsavel}
                onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                className={UI_CLASSES.inputSlate}
                placeholder="(opcional)"
              />
            </FormField>
            <FormField label="Desenvolvedor">
              <input
                type="text"
                value={form.desenvolvedor}
                onChange={(e) => setForm({ ...form, desenvolvedor: e.target.value })}
                className={UI_CLASSES.inputSlate}
                placeholder="(opcional)"
              />
            </FormField>
          </div>

          <FormField label="Fonte de Dados" helpText="Ex: Siafi, SharePoint... (opcional)">
            <input
              type="text"
              value={form.fonte_dados}
              onChange={(e) => setForm({ ...form, fonte_dados: e.target.value })}
              className={UI_CLASSES.inputSlate}
              placeholder="Ex: Siafi, SharePoint... (opcional)"
            />
          </FormField>

          <FormField label="Descrição">
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              rows={2}
              className={UI_CLASSES.inputSlate}
              placeholder="Descreva o painel..."
            />
          </FormField>

          <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5" style={{ borderColor: COLORS.border }}>
            <input
              id="dados_sensiveis"
              type="checkbox"
              checked={form.dados_sensiveis}
              onChange={(e) => setForm({ ...form, dados_sensiveis: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            <label htmlFor="dados_sensiveis" className="text-sm text-slate-700 cursor-pointer">
              Contém dados sensíveis
            </label>
          </div>

          <FormField 
            label={`Imagem de Preview ${editingId ? "(deixe vazio para manter a atual)" : ""}`}
            helpText="PNG, JPG ou JPEG. Aparece como thumbnail no card."
          >
            <input
              type="file"
              accept={PREVIEW_ACCEPT}
              onChange={(e) => setPreview(e.target.files?.[0] ?? null)}
              className={UI_CLASSES.inputSlate}
            />
            {previewFileName && (
              <p className="mt-1 text-xs text-slate-500">Arquivo selecionado: {previewFileName}</p>
            )}
          </FormField>

          <FormField 
            label={`Anexar arquivo ${editingId ? "(deixe vazio para manter o atual)" : ""}`}
            helpText="PDF, Excel, Word, PowerPoint ou PBIX."
          >
            <input
              type="file"
              accept={DOCUMENT_ACCEPT}
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className={UI_CLASSES.inputSlate}
            />
            {arquivoFileName && (
              <p className="mt-1 text-xs text-slate-500">Arquivo selecionado: {arquivoFileName}</p>
            )}
          </FormField>

          {formError && (
            <p className="rounded-lg border p-2.5 text-sm border-red-200 bg-red-50 text-red-600">
              {formError}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={UI_CLASSES.buttonSecondary}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50"
            style={{ backgroundColor: COLORS.primary }}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DocumentViewerModal({ viewingUrl, downloadUrl, viewingNome, onClose }: DocumentViewerModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: COLORS.primary }}>
          <h2 className="text-sm font-medium text-white">{viewingNome}</h2>
          <div className="flex gap-2">
            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="rounded-md px-3 py-1.5 text-xs font-medium bg-white/10 text-white hover:bg-white/20 transition"
              >
                Baixar
              </a>
            )}
            {!downloadUrl && (
              <button
                type="button"
                disabled
                className="rounded-md px-3 py-1.5 text-xs font-medium bg-white/10 text-white/50 cursor-not-allowed"
              >
                Baixar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-xs font-medium bg-white/10 text-white hover:bg-white/20 transition"
            >
              Fechar
            </button>
          </div>
        </div>
        <iframe src={viewingUrl} className="h-full w-full" title={viewingNome} />
      </div>
    </div>
  );
}
