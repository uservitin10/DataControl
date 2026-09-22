"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { fetchJson, patchJson, postJson } from "@/lib/api";
import {
  DOCUMENTS_BUCKET,
  buildStorageProxyUrl,
  deleteEquipmentFile,
  deleteLicenseFile,
  fetchSignedUrl,
  generateStoragePath,
  listEquipmentFiles,
  listLicenseFiles,
  uploadEquipmentFiles,
  uploadLicenseFiles,
  uploadToStorage,
} from "@/lib/storage";
import { FileUploadInput } from "@/components/common/FileUploadInput";

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
  serial_number?: string;
  type: string;
  model: string;
  mac_ip?: string;
  responsible: string;
  sector: string;
  warranty?: string;
  equipment_state?: string;
  notes?: string;
  allocated_user?: string;
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
  serialNumber: "",
  assetId: "",
  equipmentId: "",
  macIp: "",
  sector: "",
  responsible: "",
  warranty: "",
  equipmentState: "",
};

function getItemActionLabel(editingItemId: number | null) {
  return editingItemId !== null ? "Salvar alterações" : "Cadastrar item";
}

function normalizePersonName(value?: string): string {
  return (value ?? "").toString().trim().toLocaleLowerCase("pt-BR");
}

function getInventoryOwner(item: InventoryItem): string {
  return (item.allocated_user || item.responsible || "").toString().trim();
}

function compareInventoryItems(left: InventoryItem, right: InventoryItem): number {
  const leftPerson = normalizePersonName(getInventoryOwner(left));
  const rightPerson = normalizePersonName(getInventoryOwner(right));
  const personOrder = leftPerson.localeCompare(rightPerson, "pt-BR", { sensitivity: "base" });

  if (personOrder !== 0) {
    return personOrder;
  }

  return (left.model || left.asset_id || left.equipment_id || "")
    .toString()
    .localeCompare((right.model || right.asset_id || right.equipment_id || "").toString(), "pt-BR", {
      sensitivity: "base",
    });
}

function validateInventoryCreateInput(
  formState: typeof initialFormState,
  editingItemId: number | null,
  isLicense: boolean,
  authorizationFiles: File[]
): string | null {
  if (!formState.model.trim() || !formState.responsible.trim()) {
    return "Modelo e responsável são obrigatórios.";
  }

  if (editingItemId === null && !formState.serialNumber.trim()) {
    return "Número de série é obrigatório.";
  }

  if (isLicense && !formState.assetId.trim()) {
    return "Email do responsável é obrigatório para licenças.";
  }

  const allowedTypes = new Set(["image/png", "image/jpeg", "image/jpg", "application/pdf"]);
  for (const authorizationFile of authorizationFiles) {
    if (!allowedTypes.has(authorizationFile.type.toLowerCase())) {
      return "Tipo de arquivo inválido. Use PNG, JPEG ou PDF.";
    }
  }

  return null;
}

async function uploadAuthorizationFiles(files: File[], baseName: string): Promise<string[]> {
  const authorizationPaths: string[] = [];

  for (const authorizationFile of files) {
    const path = generateStoragePath(`autorizacao_${baseName}`, authorizationFile);
    await uploadToStorage(DOCUMENTS_BUCKET, path, authorizationFile);
    authorizationPaths.push(path);
  }

  return authorizationPaths;
}

function buildAuthorizationNotes(authorizationPaths: string[]) {
  if (authorizationPaths.length === 1) {
    return `autorizacao:${authorizationPaths[0]}`;
  }

  if (authorizationPaths.length > 1) {
    return JSON.stringify({ autorizacoes: authorizationPaths });
  }

  return null;
}

function InventoryActionButtons({
  item,
  canModify,
  fileCounts,
  openFileModal,
  openEditItem,
  handleDelete,
}: Readonly<{
  item: InventoryItem;
  canModify: boolean;
  fileCounts: Record<number, number>;
  openFileModal: (item: InventoryItem) => void;
  openEditItem: (item: InventoryItem) => void;
  handleDelete: (id: number) => Promise<void>;
}>) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => openFileModal(item)}
        className="rounded-2xl bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
      >
        Arquivos ({fileCounts[item.id] ?? 0})
      </button>

      {canModify && (
        <>
          <button
            type="button"
            onClick={() => openEditItem(item)}
            className="rounded-2xl bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-200"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => void handleDelete(item.id)}
            className="rounded-2xl bg-red-100 px-3 py-1.5 text-xs font-medium text-red-800 transition-colors hover:bg-red-200"
          >
            Excluir
          </button>
        </>
      )}
    </div>
  );
}

function InventoryTable({
  items,
  canModify,
  fileCounts,
  openFileModal,
  openEditItem,
  handleDelete,
}: Readonly<{
  items: InventoryItem[];
  canModify: boolean;
  fileCounts: Record<number, number>;
  openFileModal: (item: InventoryItem) => void;
  openEditItem: (item: InventoryItem) => void;
  handleDelete: (id: number) => Promise<void>;
}>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-2">
        <thead>
          <tr className="rounded-3xl bg-slate-50 text-left text-xs font-semibold uppercase text-slate-700">
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Modelo</th>
            <th className="px-4 py-3">Número</th>
            <th className="px-4 py-3">Alocado para</th>
            <th className="px-4 py-3">IP/MAC</th>
            <th className="px-4 py-3">Setor</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.id}-${item.equipment_id ?? item.serial_number ?? item.asset_id}`} className="bg-white shadow-sm transition hover:bg-slate-50">
              <td className="px-4 py-3 text-sm text-slate-900">
                <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
                  {item.type}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-900">{item.model}</td>
              <td className="px-4 py-3 text-sm font-mono text-slate-900">
                {item.serial_number || item.equipment_id || item.asset_id || "-"}
              </td>
              <td className="px-4 py-3 text-sm text-slate-900">{item.allocated_user || item.responsible || "-"}</td>
              <td className="px-4 py-3 text-sm font-mono text-slate-600">{item.mac_ip || "-"}</td>
              <td className="px-4 py-3 text-sm text-slate-900">{item.sector || "-"}</td>
              <td className="px-4 py-3 text-sm text-slate-900">
                <span
                  className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${
                    item.equipment_state === "Operacional" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {item.equipment_state || "-"}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-900">
                <InventoryActionButtons
                  item={item}
                  canModify={canModify}
                  fileCounts={fileCounts}
                  openFileModal={openFileModal}
                  openEditItem={openEditItem}
                  handleDelete={handleDelete}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LicenseTable({
  items,
  canModify,
  fileCounts,
  openFileModal,
  openEditItem,
  handleDelete,
}: Readonly<{
  items: InventoryItem[];
  canModify: boolean;
  fileCounts: Record<number, number>;
  openFileModal: (item: InventoryItem) => void;
  openEditItem: (item: InventoryItem) => void;
  handleDelete: (id: number) => Promise<void>;
}>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-2">
        <thead>
          <tr className="rounded-3xl bg-slate-50 text-left text-xs font-semibold uppercase text-slate-700">
            <th className="px-4 py-3">Licença</th>
            <th className="px-4 py-3">Modelo</th>
            <th className="px-4 py-3">Nome</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Garantia</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.id}-${item.equipment_id ?? item.serial_number ?? item.asset_id}`} className="bg-white shadow-sm transition hover:bg-slate-50">
              <td className="px-4 py-3 text-sm text-slate-900">
                <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                  Licença
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-900">{item.model}</td>
              <td className="px-4 py-3 text-sm text-slate-900">{item.responsible || item.allocated_user || "-"}</td>
              <td className="px-4 py-3 text-sm font-mono text-slate-900">{item.asset_id || item.serial_number || item.equipment_id || "-"}</td>
              <td className="px-4 py-3 text-sm text-slate-900">{item.warranty || "-"}</td>
              <td className="px-4 py-3 text-sm text-slate-900">
                <span className="inline-flex rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                  {item.equipment_state || "-"}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-900">
                <InventoryActionButtons
                  item={item}
                  canModify={canModify}
                  fileCounts={fileCounts}
                  openFileModal={openFileModal}
                  openEditItem={openEditItem}
                  handleDelete={handleDelete}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
  const [authorizationFiles, setAuthorizationFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<InventoryItem | null>(null);
  const [itemFiles, setItemFiles] = useState<Array<{ id: string; file_url: string; file_name: string; file_type: string; created_at: string }>>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<Record<string, string>>({});
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [fileUploadFiles, setFileUploadFiles] = useState<File[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fileCounts, setFileCounts] = useState<Record<number, number>>({});
  const [viewingFileUrl, setViewingFileUrl] = useState<string | null>(null);
  const [viewingFileName, setViewingFileName] = useState<string | null>(null);
  const [viewingFileType, setViewingFileType] = useState<string | null>(null);
  const [viewingFileText, setViewingFileText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileSuccess, setFileSuccess] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"equipamentos" | "licencas" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const canModify = userRole === "admin" || userRole === "editor";
  const isLicense = formState.type === "Licença";

  const formatInventoryError = useCallback((error: unknown, fallbackMessage: string): string => {
    if (!(error instanceof Error)) {
      return fallbackMessage;
    }

    const message = error.message;
    if (/column .*user_id .*does not exist/i.test(message) || /coluna .*user_id .*não existe/i.test(message)) {
      return "Não há equipamentos alocados para este usuário.";
    }

    return message;
  }, []);

  const loadFileCountsFor = useCallback(async (items: InventoryItem[]) => {
    if (!items?.length) {
      return;
    }

    try {
      const json = await postJson<{ counts: Record<string, number> }>("/api/inventario/files-counts", {
        items: items.map((item) => ({ id: item.id, type: item.type })),
      });

      if (json && typeof json.counts === "object") {
        const numericCounts = Object.fromEntries(
          Object.entries(json.counts).map(([key, value]) => [Number(key) || key, value])
        );
        setFileCounts((previous) => ({ ...previous, ...numericCounts }));
      }
    } catch (error) {
      console.error("Failed to load file counts:", error instanceof Error ? error.message : error);
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const response = await fetchJson<{ success: true; data: PersonalInventoryResponse }>("/api/inventario/meu-inventario");
      const inventory = response.data;
      setData(inventory);
      void loadFileCountsFor([...(inventory.equipments || []), ...(inventory.licenses || [])]);
    } catch (error) {
      setError(formatInventoryError(error, "Erro ao carregar inventário"));
    }
  }, [formatInventoryError, loadFileCountsFor]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const profileResponse = await fetchJson<{ success: true; data: { role: Role } }>("/api/profile");
        const profileRole = profileResponse.data?.role ?? "viewer";
        setUserRole(profileRole);
        setCanCreate(profileRole === "admin" || profileRole === "editor");

        const inventoryResponse = await fetchJson<{ success: true; data: PersonalInventoryResponse }>("/api/inventario/meu-inventario");
        const inventory = inventoryResponse.data;
        setData(inventory);
        void loadFileCountsFor([...(inventory.equipments || []), ...(inventory.licenses || [])]);
      } catch (error) {
        setError(
          error instanceof Error && /column .*user_id .*does not exist/i.test(error.message)
            ? "Não há equipamentos alocados para este usuário."
            : error instanceof Error
              ? error.message
              : "Erro ao carregar inventário"
        );
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [loadFileCountsFor]);

  const resetForm = useCallback(() => {
    setFormState(initialFormState);
    setAuthorizationFiles([]);
    setCreateError(null);
    setCreateSuccess(null);
  }, []);

  const handleInputChange = useCallback((field: keyof typeof initialFormState, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }));
  }, []);

  const handleAuthorizationFilesChange = useCallback((files: File[]) => {
    setAuthorizationFiles(files);
  }, []);

  const isImageFile = useCallback((fileType: string) => fileType.startsWith("image/"), []);

  const getFileKindLabel = useCallback((fileType: string, fileName: string) => {
    if (isImageFile(fileType)) {
      return "Imagem";
    }

    if (fileType === "application/pdf") {
      return "PDF";
    }

    return fileName.split(".").pop()?.toUpperCase() || "Arquivo";
  }, [isImageFile]);

  const handleSectionClick = useCallback((section: "equipamentos" | "licencas") => {
    setActiveSection(section);
  }, []);

  const buildSearchValues = useCallback(
    (item: InventoryItem) =>
      [
        item.type,
        item.model,
        item.serial_number,
        item.asset_id,
        item.equipment_id,
        item.allocated_user,
        item.responsible,
        item.sector,
        item.mac_ip,
        item.equipment_state,
        item.warranty,
      ]
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.toLowerCase()),
    []
  );

  const allocatedEquipments = useMemo(() => data?.equipments ?? [], [data?.equipments]);
  const sortedEquipments = useMemo(() => allocatedEquipments.slice().sort(compareInventoryItems), [allocatedEquipments]);
  const sortedLicenses = useMemo(
    () =>
      (data?.licenses ?? [])
        .slice()
        .sort((left, right) => {
          const modelOrder = (left.model || "").toString().localeCompare((right.model || "").toString(), "pt-BR", { sensitivity: "base" });
          if (modelOrder !== 0) {
            return modelOrder;
          }

          return normalizePersonName(getInventoryOwner(left)).localeCompare(
            normalizePersonName(getInventoryOwner(right)),
            "pt-BR",
            { sensitivity: "base" }
          );
        }),
    [data?.licenses]
  );

  const licenseActiveCount = useMemo(
    () =>
      (data?.licenses ?? []).filter((item) => {
        const status = item.equipment_state?.trim().toLowerCase();
        return status?.includes("ativo") || status?.includes("ativa");
      }).length,
    [data?.licenses]
  );

  const filteredEquipments = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) {
      return sortedEquipments;
    }

    return sortedEquipments.filter((item) => buildSearchValues(item).some((value) => value.includes(normalizedSearch)));
  }, [buildSearchValues, searchQuery, sortedEquipments]);

  const filteredLicenses = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) {
      return sortedLicenses;
    }

    return sortedLicenses.filter((item) => buildSearchValues(item).some((value) => value.includes(normalizedSearch)));
  }, [buildSearchValues, searchQuery, sortedLicenses]);

  const openEditItem = useCallback((item: InventoryItem) => {
    setEditingItemId(item.id);
    setFormState({
      type: item.type,
      model: item.model ?? "",
      serialNumber: item.serial_number ?? "",
      assetId: item.asset_id ?? "",
      equipmentId: item.equipment_id ?? "",
      macIp: item.mac_ip ?? "",
      sector: item.sector ?? "",
      responsible: item.responsible ?? "",
      warranty: item.warranty ?? "",
      equipmentState: item.equipment_state ?? "",
    });
    setExistingNotes(item.notes ?? null);
    setAuthorizationFiles([]);
    setCreateError(null);
    setCreateSuccess(null);
    setShowModal(true);
  }, []);

  const openCreateItem = useCallback(() => {
    resetForm();
    setEditingItemId(null);
    setExistingNotes(null);
    setShowModal(true);
  }, [resetForm]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) {
      return;
    }

    setSaving(true);
    setCreateError(null);

    try {
      await fetchJson(`/api/inventario/meu-inventario?id=${id}`, { method: "DELETE" });
      setCreateSuccess("Item excluído com sucesso.");
      await fetchInventory();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Erro ao excluir equipamento/licença");
    } finally {
      setSaving(false);
    }
  }, [fetchInventory]);

  const handleCreate = useCallback(async () => {
    const validationError = validateInventoryCreateInput(formState, editingItemId, isLicense, authorizationFiles);

    if (validationError) {
      setCreateError(validationError);
      return;
    }

    setSaving(true);
    setCreateError(null);

    try {
      const authorizationPaths = await uploadAuthorizationFiles(authorizationFiles, `${formState.type}_${formState.model}`);
      const notes = buildAuthorizationNotes(authorizationPaths) ?? existingNotes;
      const payload = {
        type: formState.type,
        model: formState.model,
        serial_number: formState.serialNumber,
        asset_id: formState.assetId || null,
        equipment_id: formState.equipmentId || null,
        mac_ip: formState.macIp || null,
        sector: formState.sector || null,
        responsible: formState.responsible,
        warranty: formState.warranty || null,
        equipment_state: formState.equipmentState || null,
        notes,
      };

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
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : editingItemId !== null ? "Erro ao atualizar equipamento/licença" : "Erro ao cadastrar equipamento/licença");
    } finally {
      setSaving(false);
    }
  }, [authorizationFiles, editingItemId, existingNotes, fetchInventory, formState, isLicense, resetForm]);

  const openFileModal = useCallback(async (item: InventoryItem) => {
    setActiveItem(item);
    setFileError(null);
    setFileSuccess(null);
    setViewingFileUrl(null);
    setViewingFileName(null);
    setViewingFileType(null);
    setViewingFileText(null);
    setSelectedFileId(null);
    setFilePreviewUrls({});
    setFileUploadFiles([]);
    setFileModalOpen(true);
    setLoadingFiles(true);

    try {
      const files = item.type === "Licença" ? await listLicenseFiles(String(item.id)) : await listEquipmentFiles(String(item.id));
      const normalizedFiles = files.map((file) => ({
        id: file.id,
        file_url: file.file_url,
        file_name: file.file_name,
        file_type: file.file_type,
        created_at: file.created_at,
      }));

      setItemFiles(normalizedFiles);
      setSelectedFileId(normalizedFiles[0]?.id ?? null);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Erro ao carregar arquivos.");
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  const closeFileModal = useCallback(() => {
    setFileModalOpen(false);
    setActiveItem(null);
    setItemFiles([]);
    setFilePreviewUrls({});
    setSelectedFileId(null);
    setFileUploadFiles([]);
    setViewingFileUrl(null);
    setViewingFileName(null);
    setViewingFileType(null);
    setViewingFileText(null);
    setFileError(null);
    setFileSuccess(null);
    setLoadingFiles(false);
  }, []);

  useEffect(() => {
    const imageFiles = itemFiles.filter((file) => isImageFile(file.file_type));
    if (!imageFiles.length) {
      setFilePreviewUrls({});
      return;
    }

    let cancelled = false;

    void (async () => {
      const previewEntries = await Promise.all(
        imageFiles.map(async (file) => {
          const proxyUrl = buildStorageProxyUrl(DOCUMENTS_BUCKET, file.file_url);
          return proxyUrl ? ([file.id, proxyUrl] as const) : null;
        })
      );

      if (!cancelled) {
        setFilePreviewUrls(Object.fromEntries(previewEntries.filter((entry): entry is readonly [string, string] => Boolean(entry))));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isImageFile, itemFiles]);

  const handleViewFile = useCallback(
    async (file: { id: string; file_url: string; file_name: string; file_type: string; created_at: string }) => {
      setSelectedFileId(file.id);
      setFileError(null);

      const cachedUrl = filePreviewUrls[file.id] ?? null;
      if (cachedUrl && file.file_type.startsWith("image/")) {
        setViewingFileName(file.file_name);
        setViewingFileUrl(cachedUrl);
        setViewingFileType(file.file_type);
        setViewingFileText(null);
        return;
      }

      setPreviewLoading(true);
      setViewingFileUrl(null);
      setViewingFileName(null);
      setViewingFileType(null);
      setViewingFileText(null);

      try {
        const proxyUrl = buildStorageProxyUrl(DOCUMENTS_BUCKET, file.file_url);

        if (file.file_type.startsWith("image/")) {
          setViewingFileName(file.file_name);
          setViewingFileUrl(proxyUrl);
          setViewingFileType(file.file_type);
          setViewingFileText(null);
          return;
        }

        if (file.file_type.startsWith("text/") || file.file_name.endsWith(".csv")) {
          const response = await fetch(proxyUrl ?? "");
          if (!response.ok) {
            throw new Error("Falha ao carregar conteúdo do arquivo.");
          }

          const text = await response.text();
          setViewingFileName(file.file_name);
          setViewingFileType(file.file_type);
          setViewingFileText(text);
          setViewingFileUrl(proxyUrl);
          return;
        }

        if (["xlsx", "xls", "docx", "doc", "pptx", "ppt"].includes(file.file_name.split(".").pop()?.toLowerCase() ?? "")) {
          const signed = await fetchSignedUrl(DOCUMENTS_BUCKET, file.file_url, 86400);
          if (!signed) {
            throw new Error("Não foi possível gerar o link de visualização.");
          }

          setViewingFileName(file.file_name);
          setViewingFileUrl(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(signed)}`);
          setViewingFileType(file.file_type);
          setViewingFileText(null);
          return;
        }

        if (file.file_type === "application/pdf") {
          setViewingFileName(file.file_name);
          setViewingFileUrl(proxyUrl);
          setViewingFileType(file.file_type);
          setViewingFileText(null);
          return;
        }

        if (!proxyUrl) {
          throw new Error("Não foi possível gerar o link de visualização.");
        }

        setViewingFileName(file.file_name);
        setViewingFileUrl(proxyUrl);
        setViewingFileType(file.file_type);
      } catch (error) {
        setFileError(error instanceof Error ? error.message : "Erro ao gerar link de visualização.");
      } finally {
        setPreviewLoading(false);
      }
    },
    [filePreviewUrls]
  );

  const handleDeleteFile = useCallback(
    async (fileId: string) => {
      if (!activeItem) {
        return;
      }

      setLoadingFiles(true);
      setFileError(null);
      setFileSuccess(null);

      try {
        const response = activeItem.type === "Licença" ? await deleteLicenseFile(String(activeItem.id), fileId) : await deleteEquipmentFile(String(activeItem.id), fileId);
        const refreshedFiles = response.remainingFiles || [];
        setItemFiles(refreshedFiles);
        setFileSuccess("Arquivo excluído com sucesso.");

        const nextSelectedId = refreshedFiles.find((file) => file.id !== fileId)?.id ?? null;
        setSelectedFileId(nextSelectedId);

        if (nextSelectedId) {
          const nextFile = refreshedFiles.find((file) => file.id === nextSelectedId) ?? null;
          if (nextFile) {
            const nextUrl = nextFile.file_type.startsWith("image/") ? await fetchSignedUrl(DOCUMENTS_BUCKET, nextFile.file_url, 86400) : null;
            setViewingFileName(nextFile.file_name);
            setViewingFileType(nextFile.file_type);
            setViewingFileUrl(nextUrl);
          }
        } else {
          setViewingFileUrl(null);
          setViewingFileName(null);
          setViewingFileType(null);
          setViewingFileText(null);
        }
      } catch (error) {
        setFileError(error instanceof Error ? error.message : "Erro ao excluir arquivo.");
      } finally {
        setLoadingFiles(false);
      }
    },
    [activeItem]
  );

  const handleFileUpload = useCallback(async () => {
    if (!activeItem) {
      return;
    }

    if (!fileUploadFiles.length) {
      setFileError("Selecione ao menos um arquivo para enviar.");
      return;
    }

    setLoadingFiles(true);
    setFileError(null);
    setFileSuccess(null);

    try {
      const uploadedFiles = activeItem.type === "Licença"
        ? await uploadLicenseFiles(String(activeItem.id), fileUploadFiles)
        : await uploadEquipmentFiles(String(activeItem.id), fileUploadFiles);

      setItemFiles(uploadedFiles);
      setFileSuccess(`${uploadedFiles.length} arquivo(s) enviado(s) com sucesso.`);
      setFileUploadFiles([]);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Erro ao enviar arquivos.");
    } finally {
      setLoadingFiles(false);
    }
  }, [activeItem, fileUploadFiles]);

  useEffect(() => {
    if (!fileModalOpen || itemFiles.length === 0) {
      return;
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFileModal();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        const index = itemFiles.findIndex((file) => file.id === selectedFileId);
        const nextFile = itemFiles[(index + 1) % itemFiles.length];
        if (nextFile) {
          void handleViewFile(nextFile);
        }
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        const index = itemFiles.findIndex((file) => file.id === selectedFileId);
        const previousFile = itemFiles[(index - 1 + itemFiles.length) % itemFiles.length];
        if (previousFile) {
          void handleViewFile(previousFile);
        }
      }

      if (event.key === "Delete" && selectedFileId) {
        void handleDeleteFile(selectedFileId);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeFileModal, fileModalOpen, handleDeleteFile, handleViewFile, itemFiles, selectedFileId]);

  useEffect(() => {
    if (!fileModalOpen) {
      return;
    }

    if (!selectedFileId && itemFiles.length > 0) {
      setSelectedFileId(itemFiles[0].id);
    }
  }, [fileModalOpen, itemFiles, selectedFileId]);

  useEffect(() => {
    if (!activeSection) {
      return;
    }

    const target = document.getElementById(activeSection);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeSection]);

  const renderContent = () => {
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

    const isViewerWithoutItems = userRole === "viewer" && data.totalEquipments === 0 && data.totalLicenses === 0;

    if (isViewerWithoutItems) {
      return (
        <div className="space-y-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-soft">
            <h2 className="text-2xl font-bold text-slate-900">Meu Inventário</h2>
            <p className="mt-3 text-slate-600">Não há equipamentos alocados para este usuário.</p>
            <p className="mt-2 text-sm text-slate-500">
              Caso você acredite que deveria ter equipamentos alocados, entre em contato com o administrador.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {canCreate && (
          <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Cadastro rápido de equipamento ou licença</h2>
              <p className="text-sm text-slate-600">Admins e editores podem criar um novo item diretamente aqui.</p>
            </div>
            <button
              type="button"
              onClick={openCreateItem}
              className="gov-button-secondary-dark inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-xs font-medium"
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

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <label htmlFor="inventorySearch" className="block text-sm font-semibold text-slate-700">
            Buscar por equipamento, modelo, nome, email ou setor
          </label>
          <input
            id="inventorySearch"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Digite um termo para filtrar equipamentos e licenças..."
            className="mt-3 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/20"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <button
            type="button"
            onClick={() => handleSectionClick("equipamentos")}
            className="group block w-full cursor-pointer rounded-[2rem] border border-slate-200 bg-slate-50 p-8 text-left shadow-soft transition hover:border-slate-300 hover:bg-slate-100"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Equipamentos Alocados</p>
                <h2 className="mt-4 text-5xl font-bold text-slate-950">{allocatedEquipments.length}</h2>
                <p className="mt-3 max-w-2xl text-sm text-slate-600">
                  Monitores, desktops e notebooks cadastrados. Clique em um equipamento para abrir os arquivos vinculados.
                </p>
              </div>
              <div className="rounded-3xl bg-blue-50 px-5 py-4 text-blue-700 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em]">Total</p>
                <p className="mt-2 text-3xl font-semibold">{allocatedEquipments.length}</p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSectionClick("licencas")}
            className="group block w-full cursor-pointer rounded-[2rem] border border-slate-200 bg-slate-50 p-8 text-left shadow-soft transition hover:border-slate-300 hover:bg-slate-100"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Licenças Ativas</p>
                <h2 className="mt-4 text-5xl font-bold text-slate-950">{data.totalLicenses}</h2>
                <p className="mt-3 max-w-2xl text-sm text-slate-600">
                  Licenças de software vinculadas a você. Clique em uma licença para abrir os arquivos relacionados.
                </p>
              </div>
              <div className="rounded-3xl bg-emerald-50 px-5 py-4 text-emerald-700 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em]">Ativas</p>
                <p className="mt-2 text-3xl font-semibold">{licenseActiveCount}</p>
              </div>
            </div>
          </button>
        </div>

        <div className="grid gap-4">
          {activeSection === "equipamentos" && (
            <div id="equipamentos" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gov-heading">Meus Equipamentos</h2>
                <p className="mt-1 text-sm text-slate-600">Equipamentos alocados para você</p>
              </div>

              {filteredEquipments.length > 0 ? (
                <InventoryTable
                  items={filteredEquipments}
                  canModify={canModify}
                  fileCounts={fileCounts}
                  openFileModal={openFileModal}
                  openEditItem={openEditItem}
                  handleDelete={handleDelete}
                />
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center">
                  <p className="text-slate-600">Nenhum equipamento encontrado com o filtro atual.</p>
                </div>
              )}
            </div>
          )}

          {activeSection === "licencas" && (
            <div id="licencas" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gov-heading">Minhas Licenças Ativas</h2>
                <p className="mt-1 text-sm text-slate-600">Licenças de software alocadas para você</p>
              </div>

              {filteredLicenses.length > 0 ? (
                <LicenseTable
                  items={filteredLicenses}
                  canModify={canModify}
                  fileCounts={fileCounts}
                  openFileModal={openFileModal}
                  openEditItem={openEditItem}
                  handleDelete={handleDelete}
                />
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center">
                  <p className="text-slate-600">Nenhuma licença encontrada com o filtro atual.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {data.equipments.length === 0 && data.licenses.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center shadow-soft">
            <p className="text-slate-600">Nenhum equipamento ou licença alocado para você no momento.</p>
          </div>
        )}

        {showModal && typeof window !== "undefined" && createPortal(
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-4 py-4 backdrop-blur-sm">
            <div className="flex w-full max-w-3xl max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {editingItemId !== null ? "Editar equipamento / licença" : "Cadastrar novo equipamento / licença"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600">Apenas admins e editores podem usar esta função.</p>
                  </div>
                  <button type="button" onClick={() => setShowModal(false)} className="text-slate-500 transition hover:text-slate-900">
                    Fechar
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                {createError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {createError}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Tipo</span>
                    <select
                      value={formState.type}
                      onChange={(event) => handleInputChange("type", event.target.value)}
                      className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm"
                    >
                      <option value="Monitor">Monitor</option>
                      <option value="Desktop">Desktop</option>
                      <option value="Notebook">Notebook</option>
                      <option value="Licença">Licença</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Número de série</span>
                    <input
                      value={formState.serialNumber}
                      onChange={(event) => handleInputChange("serialNumber", event.target.value)}
                      className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm"
                      placeholder={isLicense ? "Ex: S/N-12345" : "Ex: SN12345"}
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Modelo</span>
                    <input
                      value={formState.model}
                      onChange={(event) => handleInputChange("model", event.target.value)}
                      className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm"
                      placeholder={isLicense ? "Ex: Power BI Pro" : "Ex: Dell OptiPlex 7000"}
                    />
                  </label>
                </div>

                {isLicense ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Responsável (nome completo)</span>
                      <input
                        value={formState.responsible}
                        onChange={(event) => handleInputChange("responsible", event.target.value)}
                        className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm"
                        placeholder="Ex: João Silva"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Email do responsável</span>
                      <input
                        type="email"
                        value={formState.assetId}
                        onChange={(event) => handleInputChange("assetId", event.target.value)}
                        className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm"
                        placeholder="usuario@empresa.com"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Responsável</span>
                      <input
                        value={formState.responsible}
                        onChange={(event) => handleInputChange("responsible", event.target.value)}
                        className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm"
                        placeholder="Ex: João Silva"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Setor</span>
                      <input
                        value={formState.sector}
                        onChange={(event) => handleInputChange("sector", event.target.value)}
                        className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm"
                        placeholder="Ex: TI"
                      />
                    </label>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">MAC/IP</span>
                    <input
                      value={formState.macIp}
                      onChange={(event) => handleInputChange("macIp", event.target.value)}
                      className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm"
                      placeholder="Ex: 00:1A:2B:3C:4D:5E"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Estado do equipamento</span>
                    <input
                      value={formState.equipmentState}
                      onChange={(event) => handleInputChange("equipmentState", event.target.value)}
                      className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm"
                      placeholder="Ex: Operacional"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Garantia</span>
                    <input
                      value={formState.warranty}
                      onChange={(event) => handleInputChange("warranty", event.target.value)}
                      className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm"
                      placeholder="Ex: 12 meses"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Observações</span>
                    <input
                      value={existingNotes ?? ""}
                      onChange={(event) => setExistingNotes(event.target.value)}
                      className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm"
                      placeholder="Informações adicionais"
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <FileUploadInput
                    files={authorizationFiles}
                    onFilesChange={handleAuthorizationFilesChange}
                    label="Anexos de autorização"
                    accept="image/png,image/jpeg,image/jpg,application/pdf"
                    multiple
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreate()}
                    disabled={saving}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {saving ? "Salvando..." : getItemActionLabel(editingItemId)}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {fileModalOpen && activeItem && typeof window !== "undefined" && createPortal(
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-4 py-4 backdrop-blur-sm">
            <div className="flex w-full max-w-5xl max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Arquivos de {activeItem.type}</h3>
                    <p className="mt-1 text-xs text-slate-600">Gerencie arquivos vinculados a este item.</p>
                  </div>
                  <button type="button" onClick={closeFileModal} className="text-slate-500 transition hover:text-slate-900">
                    Fechar
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                {fileError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{fileError}</div>
                )}
                {fileSuccess && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{fileSuccess}</div>
                )}

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 text-white shadow-sm">
                      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold">Pré-visualização</p>
                          <p className="text-[11px] text-white/65">{viewingFileName || "Selecione um arquivo no mosaico"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {viewingFileUrl && (
                            <a href={viewingFileUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20">
                              Abrir
                            </a>
                          )}
                          {viewingFileUrl && viewingFileType !== "application/pdf" && (
                            <a href={viewingFileUrl} download={viewingFileName ?? undefined} className="rounded-2xl border border-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10">
                              Baixar
                            </a>
                          )}
                          {selectedFileId && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteFile(selectedFileId)}
                              disabled={loadingFiles}
                              className="rounded-2xl border border-red-300 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-900 p-3">
                        {previewLoading ? (
                          <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center text-sm text-white/70 md:h-[360px] xl:h-[420px]">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-white/60" />
                            <p className="ml-3">Carregando preview...</p>
                          </div>
                        ) : !viewingFileUrl || !viewingFileName ? (
                          <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center text-sm text-white/70 md:h-[360px] xl:h-[420px]">
                            Clique em um card do mosaico para abrir o preview aqui.
                          </div>
                        ) : viewingFileType?.startsWith("image/") ? (
                          <Image
                            src={viewingFileUrl}
                            alt={viewingFileName ?? "Arquivo"}
                            width={1200}
                            height={900}
                            unoptimized
                            className="h-[320px] w-full rounded-2xl object-contain bg-black/20 md:h-[360px] xl:h-[420px]"
                          />
                        ) : viewingFileText ? (
                          <pre className="max-h-[420px] overflow-auto rounded-2xl bg-white/5 p-4 text-xs text-white/80">
                            {viewingFileText}
                          </pre>
                        ) : viewingFileType === "application/pdf" ? (
                          <object data={viewingFileUrl} type="application/pdf" className="h-[320px] w-full rounded-2xl bg-white md:h-[360px] xl:h-[420px]">
                            <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center text-sm text-white/70 md:h-[360px] xl:h-[420px]">
                              O navegador não conseguiu renderizar o PDF embutido.
                              <a href={viewingFileUrl} target="_blank" rel="noreferrer" className="ml-1 underline">
                                Abrir em nova aba
                              </a>
                            </div>
                          </object>
                        ) : (
                          <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center text-sm text-white/70 md:h-[360px] xl:h-[420px]">
                            Não foi possível renderizar uma pré-visualização rica para este arquivo.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm font-semibold text-slate-900">Enviar novo(s) arquivo(s)</p>
                      <p className="mt-1 text-[11px] text-slate-500">Você pode carregar até 5 arquivos por vez.</p>
                      <div className="mt-3">
                        <FileUploadInput
                          files={fileUploadFiles}
                          onFilesChange={setFileUploadFiles}
                          label="Selecione arquivos para upload"
                          accept="image/png,image/jpeg,image/jpg,application/pdf"
                          multiple
                          maxFiles={5}
                          maxSize={20 * 1024 * 1024}
                          buttonClassName="rounded-2xl border border-blue-600 bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:border-blue-700 hover:bg-blue-700"
                        />
                      </div>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button type="button" onClick={closeFileModal} className="gov-button-secondary-dark rounded-2xl px-4 py-2 text-sm font-semibold">
                          Fechar
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleFileUpload()}
                          disabled={loadingFiles || fileUploadFiles.length === 0}
                          className="gov-button rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {loadingFiles ? "Enviando..." : "Enviar arquivos"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Arquivos existentes</p>
                        <p className="text-[11px] text-slate-500">Mosaico com miniaturas e seleção rápida.</p>
                      </div>
                      <span className="text-[11px] text-slate-500">{loadingFiles ? "Carregando..." : `${itemFiles.length} arquivo(s)`}</span>
                    </div>

                    {itemFiles.length === 0 ? (
                      <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
                        Nenhum arquivo encontrado.
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {itemFiles.map((file) => {
                          const isSelected = selectedFileId === file.id;
                          const previewUrl = filePreviewUrls[file.id];

                          return (
                            <article
                              key={file.id}
                              className={`group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
                                isSelected ? "border-blue-500 ring-2 ring-blue-200" : ""
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => void handleViewFile(file)}
                                className="flex h-full w-full flex-col items-stretch border-0 bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                              >
                                <div className="relative h-44 overflow-hidden bg-slate-100">
                                  {previewUrl ? (
                                    <Image
                                      src={previewUrl}
                                      alt={file.file_name}
                                      width={800}
                                      height={600}
                                      unoptimized
                                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="flex h-full flex-col justify-center gap-3 p-4 bg-slate-800 text-white">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="rounded-full bg-slate-900/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                                          {getFileKindLabel(file.file_type, file.file_name)}
                                        </span>
                                        <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-medium text-white/80">
                                          Visualizar
                                        </span>
                                      </div>
                                      <div className="flex flex-1 flex-col justify-end">
                                        <div className="h-12 w-12 rounded-3xl bg-white/10" />
                                      </div>
                                    </div>
                                  )}
                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent px-3 py-3 text-white">
                                    <p className="line-clamp-1 text-sm font-semibold">{file.file_name}</p>
                                    <p className="mt-1 text-[11px] text-white/70">
                                      {new Date(file.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-1 flex-col gap-2 p-4">
                                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                                    <span>{file.file_type.split("/")[1] || "Arquivo"}</span>
                                    <span>{file.file_name.split(".").pop() || ""}</span>
                                  </div>
                                  <div className="mt-auto flex items-center justify-start gap-3">
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                      {isSelected ? "Selecionado" : "Ver arquivo"}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  };

  return renderContent();
}
