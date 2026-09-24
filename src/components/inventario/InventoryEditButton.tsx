"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import type { EquipmentItem } from "@/types/inventario";
import { patchJson } from "@/lib/api";

type FormState = {
  type: string;
  model: string;
  assetId: string;
  equipmentId: string;
  serialNumber: string;
  sector: string;
  allocatedUser: string;
  responsible: string;
  legalResponsible: string;
  equipmentState: string;
  warranty: string;
  notes: string;
};

type Props = {
  item: EquipmentItem;
  onSaved: (item: EquipmentItem) => void;
};

function toForm(item: EquipmentItem): FormState {
  return {
    type: item.type ?? "Desktop",
    model: item.model ?? "",
    assetId: item.assetId ?? "",
    equipmentId: item.equipmentId ?? "",
    serialNumber: item.serial_number ?? "",
    sector: item.sector ?? "",
    allocatedUser: item.allocatedUser ?? "",
    responsible: item.responsible ?? "",
    legalResponsible: item.legalResponsible ?? "",
    equipmentState: item.equipmentState ?? "",
    warranty: item.warranty ?? "",
    notes: item.notes ?? "",
  };
}

export function InventoryEditButton({ item, onSaved }: Props) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => toForm(item));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = session?.user?.role;
  const canEdit = role === "admin" || role === "editor" || role === "inventario_editor";

  if (!canEdit) return null;

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await patchJson<{ success: boolean; data: EquipmentItem }>(`/api/inventario/${item.id}`, {
        type: form.type,
        model: form.model,
        asset_id: form.assetId,
        equipment_id: form.equipmentId,
        serial_number: form.serialNumber,
        sector: form.sector,
        allocated_user: form.allocatedUser,
        responsible: form.responsible,
        legal_responsible: form.legalResponsible,
        equipment_state: form.equipmentState,
        warranty: form.warranty,
        notes: form.notes,
      });
      onSaved({
        ...item,
        ...response.data,
        type: form.type as EquipmentItem["type"],
        model: form.model,
        assetId: form.assetId,
        equipmentId: form.equipmentId,
        serial_number: form.serialNumber,
        sector: form.sector,
        allocatedUser: form.allocatedUser,
        responsible: form.responsible,
        legalResponsible: form.legalResponsible,
        equipmentState: form.equipmentState,
        warranty: form.warranty,
        notes: form.notes,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o ativo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => { setForm(toForm(item)); setError(null); setOpen(true); }} className="gov-button rounded px-3 py-1 text-sm">
        Editar
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true">
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-slate-900">Editar ativo #{item.id}</h2>
              <button type="button" onClick={() => setOpen(false)} className="gov-button-secondary rounded px-3 py-1 text-sm">Fechar</button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {(["type", "model", "assetId", "equipmentId", "serialNumber", "sector", "allocatedUser", "responsible", "legalResponsible", "equipmentState", "warranty"] as const).map((field) => (
                <label key={field} className="text-sm font-medium text-slate-700">
                  {field === "assetId" ? "Patrimônio / identificação" : field === "legalResponsible" ? "Responsável legal" : field}
                  <input value={form[field]} onChange={(event) => updateField(field, event.target.value)} className="gov-input mt-1 bg-white" />
                </label>
              ))}
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Observações<textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} rows={3} className="gov-input mt-1 bg-white" /></label>
            </div>
            {error && <p className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} className="gov-button-secondary rounded px-4 py-2 text-sm">Cancelar</button>
              <button type="submit" disabled={saving} className="gov-button rounded px-4 py-2 text-sm disabled:opacity-50">{saving ? "Salvando..." : "Salvar alterações"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}