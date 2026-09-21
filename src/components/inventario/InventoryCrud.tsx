"use client";

import { useState } from "react";
import type { EquipmentItem } from "@/types/inventario";
import { fetchJson, postJson } from "@/lib/api";

type InventoryResponse = {
  success: boolean;
  data: {
    equipments: EquipmentItem[];
    licenses: EquipmentItem[];
  };
};

type InventoryForm = {
  type: string;
  model: string;
  assetType: string;
  assetId: string;
  equipmentId: string;
  serialNumber: string;
  sector: string;
  allocatedUser: string;
  responsible: string;
  equipmentState: string;
  warranty: string;
  notes: string;
};

const EMPTY_FORM: InventoryForm = {
  type: "Desktop",
  model: "",
  assetType: "",
  assetId: "",
  equipmentId: "",
  serialNumber: "",
  sector: "",
  allocatedUser: "",
  responsible: "",
  equipmentState: "",
  warranty: "",
  notes: "",
};

function formToPayload(form: InventoryForm) {
  return {
    type: form.type,
    model: form.model,
    asset_type: form.assetType,
    asset_id: form.assetId,
    equipment_id: form.equipmentId,
    serial_number: form.serialNumber,
    sector: form.sector,
    allocated_user: form.allocatedUser,
    responsible: form.responsible,
    equipment_state: form.equipmentState,
    warranty: form.warranty,
    notes: form.notes,
  };
}

type Props = {
  canCreate: boolean;
  onItemsChanged: (response: InventoryResponse["data"]) => void;
};

export function InventoryCrud({ canCreate, onItemsChanged }: Props) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<InventoryForm>(EMPTY_FORM);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setError(null);
    setIsFormOpen(true);
  };

  const reloadItems = async () => {
    const response = await fetchJson<InventoryResponse>("/api/inventario");
    onItemsChanged(response.data);
  };

  const submitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      await postJson("/api/inventario", formToPayload(form));
      await reloadItems();
      setIsFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o ativo.");
    } finally {
      setPending(false);
    }
  };

  const updateField = (field: keyof InventoryForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="mt-10 flex justify-end">
      {canCreate && (
        <button type="button" onClick={openCreate} className="gov-button rounded-lg px-4 py-2 text-sm font-semibold">
          Novo ativo
        </button>
      )}

      {error && <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="inventory-form-title">
          <form onSubmit={submitForm} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="inventory-form-title" className="text-xl font-semibold text-slate-900">Novo ativo</h3>
                <p className="mt-1 text-sm text-slate-500">Preencha os dados principais do item.</p>
              </div>
              <button type="button" onClick={() => setIsFormOpen(false)} className="gov-button-ghost rounded-lg px-3 py-1.5 text-sm">Fechar</button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Tipo<select required value={form.type} onChange={(event) => updateField("type", event.target.value)} className="gov-input mt-1 bg-white"><option>Monitor</option><option>Desktop</option><option>Notebook</option><option>Licença</option></select></label>
              <label className="text-sm font-medium text-slate-700">Modelo<input required value={form.model} onChange={(event) => updateField("model", event.target.value)} className="gov-input mt-1 bg-white" /></label>
              <label className="text-sm font-medium text-slate-700">Setor<input required value={form.sector} onChange={(event) => updateField("sector", event.target.value)} className="gov-input mt-1 bg-white" /></label>
              <label className="text-sm font-medium text-slate-700">Tipo de ativo<input value={form.assetType} onChange={(event) => updateField("assetType", event.target.value)} className="gov-input mt-1 bg-white" /></label>
              <label className="text-sm font-medium text-slate-700">Patrimônio / identificação<input value={form.assetId} onChange={(event) => updateField("assetId", event.target.value)} className="gov-input mt-1 bg-white" /></label>
              <label className="text-sm font-medium text-slate-700">ID do equipamento<input value={form.equipmentId} onChange={(event) => updateField("equipmentId", event.target.value)} className="gov-input mt-1 bg-white" /></label>
              <label className="text-sm font-medium text-slate-700">Número de série<input value={form.serialNumber} onChange={(event) => updateField("serialNumber", event.target.value)} className="gov-input mt-1 bg-white" /></label>
              <label className="text-sm font-medium text-slate-700">Usuário alocado<input value={form.allocatedUser} onChange={(event) => updateField("allocatedUser", event.target.value)} className="gov-input mt-1 bg-white" /></label>
              <label className="text-sm font-medium text-slate-700">Responsável<input value={form.responsible} onChange={(event) => updateField("responsible", event.target.value)} className="gov-input mt-1 bg-white" /></label>
              <label className="text-sm font-medium text-slate-700">Estado<input value={form.equipmentState} onChange={(event) => updateField("equipmentState", event.target.value)} className="gov-input mt-1 bg-white" /></label>
              <label className="text-sm font-medium text-slate-700">Garantia / validade<input value={form.warranty} onChange={(event) => updateField("warranty", event.target.value)} className="gov-input mt-1 bg-white" /></label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Observações<textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} rows={3} className="gov-input mt-1 bg-white" /></label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setIsFormOpen(false)} className="gov-button-secondary rounded-lg px-4 py-2 text-sm">Cancelar</button>
              <button type="submit" disabled={pending} className="gov-button rounded-lg px-4 py-2 text-sm disabled:opacity-50">{pending ? "Salvando..." : "Salvar ativo"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}