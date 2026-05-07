import type { Dispatch, SetStateAction } from "react";
import type { DashboardForm } from "@/src/types/dashboard";
import { AREAS, SECRETARIAS } from "@/src/lib/dashboard";
import { PREVIEW_ACCEPT, DOCUMENT_ACCEPT } from "@/src/lib/storage";

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
        <h2 className="mb-5 text-lg font-medium" style={{ color: "#1a2744" }}>
          {editingId ? "Editar Painel" : "Novo Painel"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Nome *</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none border-slate-300"
              placeholder="Nome do painel"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Área *</label>
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none border-slate-300"
            >
              {AREAS.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Link do painel</label>
            <input
              type="url"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none border-slate-300"
              placeholder="https://"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Tipo de Acesso</label>
              <select
                value={form.tipo_acesso}
                onChange={(e) => setForm({ ...form, tipo_acesso: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none border-slate-300"
              >
                <option value="publico">Público</option>
                <option value="restrito">Restrito</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Secretaria</label>
              <select
                value={form.secretaria}
                onChange={(e) => setForm({ ...form, secretaria: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none border-slate-300"
              >
                <option value="">Selecione (opcional)</option>
                {SECRETARIAS.map((secretaria) => (
                  <option key={secretaria} value={secretaria}>{secretaria}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Responsável</label>
              <input
                type="text"
                value={form.responsavel}
                onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none border-slate-300"
                placeholder="(opcional)"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Desenvolvedor</label>
              <input
                type="text"
                value={form.desenvolvedor}
                onChange={(e) => setForm({ ...form, desenvolvedor: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none border-slate-300"
                placeholder="(opcional)"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Fonte de Dados</label>
            <input
              type="text"
              value={form.fonte_dados}
              onChange={(e) => setForm({ ...form, fonte_dados: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none border-slate-300"
              placeholder="Ex: Siafi, SharePoint... (opcional)"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              rows={2}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none border-slate-300"
              placeholder="Descreva o painel..."
            />
          </div>

          <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5" style={{ borderColor: "#cbd5e1" }}>
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

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Imagem de Preview {editingId && "(deixe vazio para manter a atual)"}
            </label>
            <input
              type="file"
              accept={PREVIEW_ACCEPT}
              onChange={(e) => setPreview(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none border-slate-300"
            />
            {previewFileName && (
              <p className="mt-1 text-xs text-slate-500">Arquivo selecionado: {previewFileName}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">PNG, JPG ou JPEG. Aparece como thumbnail no card.</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Anexar arquivo {editingId && "(deixe vazio para manter o atual)"}
            </label>
            <input
              type="file"
              accept={DOCUMENT_ACCEPT}
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none border-slate-300"
            />
            {arquivoFileName && (
              <p className="mt-1 text-xs text-slate-500">Arquivo selecionado: {arquivoFileName}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">PDF, Excel, Word, PowerPoint ou PBIX.</p>
          </div>

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
            className="rounded-lg border px-4 py-2 text-sm text-slate-600 border-slate-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50"
            style={{ backgroundColor: "#1a2744" }}
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
        <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: "#1a2744" }}>
          <h2 className="text-sm font-medium text-white">{viewingNome}</h2>
          <div className="flex gap-2">
            <a
              href={downloadUrl || "#"}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md px-3 py-1.5 text-xs font-medium bg-white/10 text-white"
            >
              Baixar
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-xs font-medium bg-white/10 text-white"
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
