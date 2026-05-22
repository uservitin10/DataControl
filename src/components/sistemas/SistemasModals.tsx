import type { SistemaForm } from "@/types/dashboard";
import { SistemasForm } from "./SistemasForm";

type SistemasModalProps = {
  isOpen: boolean;
  form: SistemaForm;
  formError: string;
  saving: boolean;
  editingId: string | null;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  setForm: (form: SistemaForm) => void;
};

export function SistemasModal({
  isOpen,
  form,
  formError,
  saving,
  editingId,
  onSubmit,
  onCancel,
  setForm,
}: SistemasModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-200"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between p-6 border-b bg-white rounded-t-2xl">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? "Editar Sistema" : "Novo Sistema"}
            </h2>
            <button
              onClick={onCancel}
              disabled={saving}
              className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <SistemasForm
              form={form}
              formError={formError}
              saving={saving}
              editingId={editingId}
              onSubmit={onSubmit}
              onCancel={onCancel}
              setForm={setForm}
            />
          </div>
        </div>
      </div>
    </>
  );
}
