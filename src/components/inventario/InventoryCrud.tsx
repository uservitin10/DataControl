"use client";

import { useMemo, useState } from "react";
import type { EquipmentItem } from "@/types/inventario";
import { fetchJson, patchJson, postJson } from "@/lib/api";

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

function itemToForm(item: EquipmentItem): InventoryForm {
  const source = item as EquipmentItem & Record<string, unknown>;
  return {
    type: String(item.type ?? "Desktop"),
    model: String(item.model ?? ""),
    assetType: String(item.assetType ?? source.asset_type ?? ""),
    assetId: String(item.assetId ?? source.asset_id ?? ""),
    equipmentId: String(item.equipmentId ?? source.equipment_id ?? ""),
    serialNumber: String(item.serial_number ?? ""),
    sector: String(item.sector ?? ""),
    allocatedUser: String(item.allocatedUser ?? source.allocated_user ?? ""),
    responsible: String(item.responsible ?? ""),
    equipmentState: String(item.equipmentState ?? source.equipment_state ?? ""),
    warranty: String(item.warranty ?? ""),
    notes: String(item.notes ?? ""),
  };
}

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
  items: EquipmentItem[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onItemsChanged: (response: InventoryResponse["data"]) => void;
};

export function InventoryCrud({ items, canCreate, canEdit, canDelete, onItemsChanged }: Props) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
  const [form, setForm] = useState<InventoryForm>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) =>
      [item.type, item.model, item.sector, item.assetId, item.equipmentId, item.allocatedUser, item.responsible]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [items, search]);

  const openCreate = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setError(null);
    setIsFormOpen(true);
  };

  const openEdit = (item: EquipmentItem) => {
    setEditingItem(item);
    setForm(itemToForm(item));
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
      if (editingItem) {
        await patchJson(`/api/inventario/${editingItem.id}`, formToPayload(form));
      } else {
        await postJson("/api/inventario", formToPayload(form));
      }
      await reloadItems();
      setIsFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o ativo.");
    } finally {
      setPending(false);
    }
  };

  const removeItem = async (item: EquipmentItem) => {
    if (!window.confirm(`Excluir o ativo ${item.model || item.assetId || "selecionado"}?`)) return;

    setPending(true);
    setError(null);
    try {
      await fetchJson(`/api/inventario/${item.id}`, { method: "DELETE" });
      await reloadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir o ativo.");
    } finally {
      setPending(false);
    }
  };

  const updateField = (field: keyof InventoryForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <section className="mt-10 rounded-3xl border border-slate-200 bg-slate-50/70 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Cadastro</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Gerenciar ativos</h2>
          <p className="mt-1 text-sm text-slate-500">Crie, edite ou remova itens do inventário.</p>
        </div>
        {canCreate && (
          <button type="button" onClick={openCreate} className="gov-button rounded-lg px-4 py-2 text-sm font-semibold">
            Novo ativo
          </button>
        )}
      </div>

      {error && <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por modelo, patrimônio, setor ou usuário..."
        className="gov-input mt-6 bg-white"
        aria-label="Buscar ativos"
      />

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Modelo</th>
              <th className="px-4 py-3">Setor</th>
              <th className="px-4 py-3">Identificação</th>
              <th className="px-4 py-3">Estado</th>
              {(canEdit || canDelete) && <th className="px-4 py-3">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={String(item.id)} className="border-t border-slate-100 text-sm text-slate-800">
                <td className="px-4 py-3">{item.type || "-"}</td>
                <td className="px-4 py-3 font-medium">{item.model || "-"}</td>
                <td className="px-4 py-3">{item.sector || "-"}</td>
                <td className="px-4 py-3">{item.assetId || item.equipmentId || "-"}</td>
                <td className="px-4 py-3">{item.equipmentState || "-"}</td>
                {(canEdit || canDelete) && (
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {canEdit && <button type="button" onClick={() => openEdit(item)} className="gov-button-secondary rounded-lg px-3 py-1.5 text-xs">Editar</button>}
                      {canDelete && <button type="button" onClick={() => void removeItem(item)} disabled={pending} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50">Excluir</button>}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {visibleItems.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">Nenhum ativo encontrado.</td></tr>}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="inventory-form-title">
          <form onSubmit={submitForm} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="inventory-form-title" className="text-xl font-semibold text-slate-900">{editingItem ? "Editar ativo" : "Novo ativo"}</h3>
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
    </section>
  );
}