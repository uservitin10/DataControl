"use client";

import { useEffect, useState } from "react";
import { fetchJson, postJson, patchJson } from "@/lib/api";
import { DOCUMENTS_BUCKET, generateStoragePath, uploadToStorage } from "@/lib/storage";

type Role =
  | "admin"
  | "editor"
  | "viewer"
  | "painel_editor"
  | "sistema_editor"
  | "inventario_editor";

interface InventoryItem {
  id: number;
  asset_id?: string;
  equipment_id?: string;
  type: string;
  model: string;
  mac_ip?: string;
  responsible: string;
  sector: string;
  warranty?: string;
  equipment_state?: string;
  bios?: string;
  notes?: string;
}

interface PersonalInventoryResponse {
  user: {
    id: string;
    displayName: string;
  };
  equipments: InventoryItem[];
  licenses: InventoryItem[];
  totalEquipments: number;
  totalLicenses: number;
}

const initialFormState = {
  type: "Monitor",
  model: "",
  assetId: "",
  equipmentId: "",
  macIp: "",
  sector: "",
  responsible: "",
  warranty: "",
  equipmentState: "",
};

export function PersonalInventory() {
  const [data, setData] = useState<PersonalInventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formState, setFormState] = useState(initialFormState);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [existingNotes, setExistingNotes] = useState<string | null>(null);
  const [authorizationFile, setAuthorizationFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const fetchInventory = async () => {
    try {
      const response = await fetchJson<PersonalInventoryResponse>(
        "/api/inventario/meu-inventario"
      );
      setData(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar inventário"
      );
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchInventory();
        const profile = await fetchJson<{ role: Role }>("/api/profile");
        setUserRole(profile.role);
        setCanCreate(profile.role === "admin" || profile.role === "editor");
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Erro ao carregar inventário");
        }
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const resetForm = () => {
    setFormState(initialFormState);
    setAuthorizationFile(null);
    setCreateError(null);
    setCreateSuccess(null);
  };

  const handleInputChange = (
    field: keyof typeof initialFormState,
    value: string
  ) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleFileChange = (file: File | null) => {
    setAuthorizationFile(file);
  };

  const canModify = userRole === "admin" || userRole === "editor";
  const isLicense = formState.type === "Licença";

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) {
      return;
    }

    setSaving(true);
    setCreateError(null);
    try {
      await fetchJson(`/api/inventario/meu-inventario?id=${id}`, {
        method: "DELETE",
      });
      setCreateSuccess("Item excluído com sucesso.");
      await fetchInventory();
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : "Erro ao excluir equipamento/licença"
      );
    } finally {
      setSaving(false);
    }
  };

  const openEditItem = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setFormState({
      type: item.type,
      model: item.model ?? "",
      assetId: item.asset_id ?? "",
      equipmentId: item.equipment_id ?? "",
      macIp: item.mac_ip ?? "",
      sector: item.sector ?? "",
      responsible: item.responsible ?? "",
      warranty: item.warranty ?? "",
      equipmentState: item.equipment_state ?? "",
    });
    setExistingNotes(item.notes ?? null);
    setAuthorizationFile(null);
    setCreateError(null);
    setCreateSuccess(null);
    setShowModal(true);
  };

  const openCreateItem = () => {
    resetForm();
    setEditingItemId(null);
    setExistingNotes(null);
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (!formState.model.trim() || !formState.responsible.trim()) {
      setCreateError("Modelo e responsável são obrigatórios.");
      return;
    }

    if (isLicense && !formState.assetId.trim()) {
      setCreateError("Email do responsável é obrigatório para licenças.");
      return;
    }

    if (authorizationFile) {
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
      if (!allowedTypes.includes(authorizationFile.type.toLowerCase())) {
        setCreateError("Tipo de arquivo inválido. Use PNG, JPEG ou PDF.");
        return;
      }
    }

    setSaving(true);
    setCreateError(null);

    let authorizationPath: string | null = null;
    if (authorizationFile) {
      const path = generateStoragePath(
        `autorizacao_${formState.type}_${formState.model}`,
        authorizationFile
      );
      try {
        await uploadToStorage(DOCUMENTS_BUCKET, path, authorizationFile);
        authorizationPath = path;
      } catch (uploadError) {
        setCreateError(
          (uploadError as Error).message || "Erro no upload do arquivo de autorização."
        );
        setSaving(false);
        return;
      }
    }

    const payload = {
      type: formState.type,
      model: formState.model,
      asset_id: formState.assetId || null,
      equipment_id: formState.equipmentId || null,
      mac_ip: formState.macIp || null,
      sector: formState.sector || null,
      responsible: formState.responsible,
      warranty: formState.warranty || null,
      equipment_state: formState.equipmentState || null,
      notes: authorizationPath ? `autorizacao:${authorizationPath}` : existingNotes,
    };

    try {
      if (editingItemId !== null) {
        await patchJson(`/api/inventario/meu-inventario?id=${editingItemId}`, payload);
        setCreateSuccess("Equipamento/licença atualizado com sucesso.");
      } else {
        await postJson("/api/inventario/meu-inventario", payload);
        setCreateSuccess("Equipamento/licença cadastrado com sucesso.");
      }
      resetForm();
      setEditingItemId(null);
      setExistingNotes(null);
      setShowModal(false);
      await fetchInventory();
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : editingItemId !== null
          ? "Erro ao atualizar equipamento/licença"
          : "Erro ao cadastrar equipamento/licença"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-soft">
        <p className="text-center text-slate-600">Carregando seus equipamentos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-10 shadow-soft">
        <p className="text-red-700">Erro: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-soft">
        <p className="text-slate-600">Nenhum dado disponível</p>
      </div>
    );
  }

  const hasLicenses = data.licenses && data.licenses.length > 0;

  return (
    <div className="space-y-8">
      {canCreate && (
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Cadastro rápido de equipamento ou licença
            </h2>
            <p className="text-sm text-slate-600">
              Admins e editores podem criar um novo item diretamente aqui.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateItem}
            className="gov-button rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Cadastrar novo item
          </button>
        </div>
      )}

      {createSuccess && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          {createSuccess}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6">
          <p className="text-sm font-medium text-slate-600">Equipamentos Alocados</p>
          <p className="mt-2 text-3xl font-bold text-blue-700">
            {data.totalEquipments}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {data.totalEquipments === 1 ? "equipamento" : "equipamentos"}
          </p>
        </div>

        {hasLicenses && (
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-6">
            <p className="text-sm font-medium text-slate-600">Licenças Ativas</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {data.totalLicenses}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {data.totalLicenses === 1 ? "licença ativa" : "licenças ativas"}
            </p>
          </div>
        )}
      </div>

      {/* ... rest of tables remain unchanged ... */}
      {data.equipments && data.equipments.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gov-heading">Meus Equipamentos</h2>
            <p className="mt-1 text-sm text-slate-600">
              Equipamentos alocados para você
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="rounded-3xl bg-slate-50 text-left text-xs font-semibold uppercase text-slate-700">
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Modelo</th>
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">IP/MAC</th>
                  <th className="px-4 py-3">Setor</th>
                  <th className="px-4 py-3">Estado</th>
                  {canModify && <th className="px-4 py-3">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {data.equipments.map((item) => (
                  <tr
                    key={`${item.id}-${item.equipment_id}`}
                    className="bg-white shadow-sm transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {item.model}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-900">
                      {item.equipment_id || item.asset_id || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-600">
                      {item.mac_ip || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {item.sector || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <span
                        className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${
                          item.equipment_state === "Operacional"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.equipment_state || "-"}
                      </span>
                    </td>
                    {canModify && (
                      <td className="px-4 py-3 text-sm text-slate-900">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditItem(item)}
                            className="rounded px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="rounded px-3 py-1.5 text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasLicenses && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gov-heading">Minhas Licenças Ativas</h2>
            <p className="mt-1 text-sm text-slate-600">
              Licenças de software alocadas para você
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="rounded-3xl bg-slate-50 text-left text-xs font-semibold uppercase text-slate-700">
                  <th className="px-4 py-3">Licença</th>
                  <th className="px-4 py-3">Modelo</th>
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Garantia</th>
                  <th className="px-4 py-3">Estado</th>
                  {canModify && <th className="px-4 py-3">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {data.licenses.map((item) => (
                  <tr
                    key={`${item.id}-${item.equipment_id}`}
                    className="bg-white shadow-sm transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                        Licença
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {item.model}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-900">
                      {item.equipment_id || item.asset_id || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {item.warranty || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <span className="inline-flex rounded px-2 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700">
                        {item.equipment_state || "-"}
                      </span>
                    </td>
                    {canModify && (
                      <td className="px-4 py-3 text-sm text-slate-900">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditItem(item)}
                            className="rounded px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="rounded px-3 py-1.5 text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.equipments.length === 0 && data.licenses.length === 0 && (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-soft text-center">
          <p className="text-slate-600">
            Nenhum equipamento ou licença alocado para você no momento.
          </p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {editingItemId !== null ? "Editar equipamento / licença" : "Cadastrar novo equipamento / licença"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Apenas admins e editores podem usar esta função.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-slate-500 transition hover:text-slate-900"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="space-y-6 p-6">
              {createError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {createError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Tipo</span>
                  <select
                    value={formState.type}
                    onChange={(e) => handleInputChange("type", e.target.value)}
                    className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm"
                  >
                    <option value="Monitor">Monitor</option>
                    <option value="Desktop">Desktop</option>
                    <option value="Notebook">Notebook</option>
                    <option value="Licença">Licença</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Modelo</span>
                  <input
                    value={formState.model}
                    onChange={(e) => handleInputChange("model", e.target.value)}
                    className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm"
                    placeholder={isLicense ? "Ex: Power BI Pro" : "Ex: Dell OptiPlex 7000"}
                  />
                </label>
              </div>

              {isLicense ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Responsável (nome completo)</span>
                    <input
                      value={formState.responsible}
                      onChange={(e) => handleInputChange("responsible", e.target.value)}
                      className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm"
                      placeholder="Ex: João Silva"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Email do responsável</span>
                    <input
                      type="email"
                      value={formState.assetId}
                      onChange={(e) => handleInputChange("assetId", e.target.value)}
                      className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm"
                      placeholder="Ex: nome@empresa.gov.br"
                    />
                  </label>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">ID do ativo</span>
                      <input
                        value={formState.assetId}
                        onChange={(e) => handleInputChange("assetId", e.target.value)}
                        className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm"
                        placeholder="Ex: 12345"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Número do equipamento</span>
                      <input
                        value={formState.equipmentId}
                        onChange={(e) => handleInputChange("equipmentId", e.target.value)}
                        className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm"
                        placeholder="Ex: EQP-001"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">MAC / IP</span>
                      <input
                        value={formState.macIp}
                        onChange={(e) => handleInputChange("macIp", e.target.value)}
                        className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm"
                        placeholder="Ex: 192.168.0.10"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Setor</span>
                      <input
                        value={formState.sector}
                        onChange={(e) => handleInputChange("sector", e.target.value)}
                        className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm"
                        placeholder="Ex: TI"
                      />
                    </label>
                  </div>
                </>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Estado</span>
                  <select
                    value={formState.equipmentState}
                    onChange={(e) => handleInputChange("equipmentState", e.target.value)}
                    className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm"
                  >
                    <option value="">Selecione</option>
                    {isLicense ? (
                      <>
                        <option value="Ativo">Ativo</option>
                        <option value="Desativado">Desativado</option>
                      </>
                    ) : (
                      <>
                        <option value="Operacional">Operacional</option>
                        <option value="Manutenção">Manutenção</option>
                        <option value="Inoperante">Inoperante</option>
                        <option value="Desativado">Desativado</option>
                      </>
                    )}
                  </select>
                </label>
                {!isLicense && (
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Garantia</span>
                    <input
                      value={formState.warranty}
                      onChange={(e) => handleInputChange("warranty", e.target.value)}
                      className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm"
                      placeholder="Ex: 12 meses"
                    />
                  </label>
                )}
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  {isLicense ? "Arquivo de autorização" : "Foto do equipamento"}
                </span>
                <input
                  type="file"
                  accept=".png,.jpeg,.jpg,.pdf"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm"
                />
                {authorizationFile && (
                  <p className="mt-2 text-sm text-slate-500">Arquivo selecionado: {authorizationFile.name}</p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  {isLicense
                    ? "Envie PNG, JPG ou PDF para confirmar autorização."
                    : "Envie PNG, JPG ou PDF com a foto do equipamento."}
                </p>
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="gov-button-secondary-dark rounded-2xl px-5 py-3 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving}
                  className="gov-button rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Salvando..." : editingItemId !== null ? "Salvar alterações" : "Cadastrar item"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
