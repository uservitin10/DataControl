"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { fetchJson, postJson, patchJson } from "@/lib/api";
import {
  DOCUMENTS_BUCKET,
  generateStoragePath,
  uploadToStorage,
  fetchSignedUrl,
  listEquipmentFiles,
  uploadEquipmentFiles,
  deleteEquipmentFile,
  listLicenseFiles,
  uploadLicenseFiles,
  deleteLicenseFile,
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
  bios?: string;
  notes?: string;
  allocated_user?: string;
  allocated_user_id?: string;
  user_id?: string;
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

function normalizePersonName(value?: string): string {
  return (value ?? "").toString().trim().toLocaleLowerCase("pt-BR");
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
  const [itemFiles, setItemFiles] = useState<Array<{
    id: string;
    file_url: string;
    file_name: string;
    file_type: string;
    created_at: string;
  }>>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<Record<string, string>>({});
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [fileUploadFiles, setFileUploadFiles] = useState<File[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [viewingFileUrl, setViewingFileUrl] = useState<string | null>(null);
  const [viewingFileName, setViewingFileName] = useState<string | null>(null);
  const [viewingFileType, setViewingFileType] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileSuccess, setFileSuccess] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"equipamentos" | "licencas" | null>(null);

  const filterViewerItems = (
    items: InventoryItem[],
    user: PersonalInventoryResponse["user"]
  ) => {
    const normalizedUserName = user.displayName?.trim().toLowerCase();

    return items.filter((item) => {
      const matchesUserId =
        item.allocated_user_id === user.id || item.user_id === user.id;
      const allocatedUserName = item.allocated_user?.trim().toLowerCase();
      const matchesAllocatedName =
        normalizedUserName && allocatedUserName
          ? allocatedUserName === normalizedUserName ||
            allocatedUserName.includes(normalizedUserName) ||
            normalizedUserName.includes(allocatedUserName)
          : false;

      return matchesUserId || matchesAllocatedName;
    });
  };

  const fetchInventory = async (role: Role | null = userRole) => {
    try {
      const response = await fetchJson<PersonalInventoryResponse>(
        "/api/inventario/meu-inventario"
      );

      if (role === "viewer") {
        const filteredEquipments = filterViewerItems(response.equipments, response.user);
        const filteredLicenses = filterViewerItems(response.licenses, response.user);

        setData({
          ...response,
          equipments: filteredEquipments,
          licenses: filteredLicenses,
          totalEquipments: filteredEquipments.length,
          totalLicenses: filteredLicenses.length,
        });
      } else {
        setData(response);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? /column .*user_id .*does not exist/i.test(err.message) ||
            /coluna .*user_id .*não existe/i.test(err.message)
            ? "Não há equipamentos alocados para este usuário."
            : err.message
          : "Erro ao carregar inventário"
      );
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const profile = await fetchJson<{ role: Role }>("/api/profile");
        const role = profile.role;
        setUserRole(role);
        setCanCreate(role === "admin" || role === "editor");
        await fetchInventory(role);
      } catch (err) {
        if (err instanceof Error) {
          setError(
            /column .*user_id .*does not exist/i.test(err.message) ||
            /coluna .*user_id .*não existe/i.test(err.message)
              ? "Não há equipamentos alocados para este usuário."
              : err.message
          );
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
    setAuthorizationFiles([]);
    setCreateError(null);
    setCreateSuccess(null);
  };

  const handleInputChange = (
    field: keyof typeof initialFormState,
    value: string
  ) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleAuthorizationFilesChange = (files: File[]) => {
    setAuthorizationFiles(files);
  };

  const isImageFile = (fileType: string) => fileType.startsWith("image/");

  const getFileKindLabel = (fileType: string, fileName: string) => {
    if (isImageFile(fileType)) return "Imagem";
    if (fileType === "application/pdf") return "PDF";

    const extension = fileName.split(".").pop()?.toUpperCase();
    return extension || "Arquivo";
  };

  const getFileVisualStyle = (index: number, selected: boolean) => {
    const variants = [
      "sm:col-span-2 sm:row-span-2 min-h-72",
      "sm:col-span-1 sm:row-span-1 min-h-48",
      "sm:col-span-1 sm:row-span-1 min-h-48",
      "sm:col-span-2 sm:row-span-1 min-h-56",
      "sm:col-span-1 sm:row-span-1 min-h-48",
    ];

    return `${variants[index % variants.length]} ${selected ? "ring-2 ring-slate-900 ring-offset-2" : ""}`;
  };

  const openFileModal = async (item: InventoryItem) => {
    setActiveItem(item);
    setFileError(null);
    setFileSuccess(null);
    setViewingFileUrl(null);
    setViewingFileName(null);
    setViewingFileType(null);
    setSelectedFileId(null);
    setFilePreviewUrls({});
    setFileUploadFiles([]);
    setFileModalOpen(true);
    setLoadingFiles(true);

    try {
      const files = item.type === "Licença"
        ? await listLicenseFiles(String(item.id))
        : await listEquipmentFiles(String(item.id));
      setItemFiles(files.map((file) => ({
        id: file.id,
        file_url: file.file_url,
        file_name: file.file_name,
        file_type: file.file_type,
        created_at: file.created_at,
      })));
      setSelectedFileId(files[0]?.id ?? null);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Erro ao carregar arquivos.");
    } finally {
      setLoadingFiles(false);
    }
  };

  const closeFileModal = () => {
    setFileModalOpen(false);
    setActiveItem(null);
    setItemFiles([]);
    setFilePreviewUrls({});
    setSelectedFileId(null);
    setFileUploadFiles([]);
    setViewingFileUrl(null);
    setViewingFileName(null);
    setViewingFileType(null);
    setFileError(null);
    setFileSuccess(null);
    setLoadingFiles(false);
  };

  useEffect(() => {
    let cancelled = false;

    const loadFilePreviews = async () => {
      const imageFiles = itemFiles.filter((file) => isImageFile(file.file_type));

      if (!imageFiles.length) {
        setFilePreviewUrls({});
        return;
      }

      const previewEntries = await Promise.all(
        imageFiles.map(async (file) => {
          const signedUrl = await fetchSignedUrl(DOCUMENTS_BUCKET, file.file_url, 3600);
          return signedUrl ? ([file.id, signedUrl] as const) : null;
        })
      );

      if (cancelled) return;

      setFilePreviewUrls(
        Object.fromEntries(previewEntries.filter((entry): entry is readonly [string, string] => Boolean(entry)))
      );
    };

    void loadFilePreviews();

    return () => {
      cancelled = true;
    };
  }, [itemFiles]);

  useEffect(() => {
    if (!fileModalOpen) return;

    if (!selectedFileId && itemFiles.length > 0) {
      setSelectedFileId(itemFiles[0].id);
    }
  }, [fileModalOpen, itemFiles, selectedFileId]);

  const handleFileUpload = async () => {
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
      const files = activeItem.type === "Licença"
        ? await uploadLicenseFiles(String(activeItem.id), fileUploadFiles)
        : await uploadEquipmentFiles(String(activeItem.id), fileUploadFiles);

      setFileSuccess(`${files.length} arquivo(s) enviado(s) com sucesso.`);
      setFileUploadFiles([]);
      if (activeItem.type === "Licença") {
        setItemFiles(await listLicenseFiles(String(activeItem.id)));
      } else {
        setItemFiles(await listEquipmentFiles(String(activeItem.id)));
      }
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Erro ao enviar arquivos.");
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!activeItem) return;

    setLoadingFiles(true);
    setFileError(null);
    setFileSuccess(null);

    try {
      if (activeItem.type === "Licença") {
        await deleteLicenseFile(String(activeItem.id), fileId);
      } else {
        await deleteEquipmentFile(String(activeItem.id), fileId);
      }
      setFileSuccess("Arquivo excluído com sucesso.");
      const refreshedFiles = activeItem.type === "Licença"
        ? await listLicenseFiles(String(activeItem.id))
        : await listEquipmentFiles(String(activeItem.id));

      setItemFiles(refreshedFiles);
      const nextSelectedId = refreshedFiles.find((file) => file.id !== fileId)?.id ?? null;
      setSelectedFileId(nextSelectedId);

      if (nextSelectedId) {
        const nextFile = refreshedFiles.find((file) => file.id === nextSelectedId) ?? null;
        if (nextFile) {
          const nextUrl = nextFile.file_type.startsWith("image/")
            ? await fetchSignedUrl(DOCUMENTS_BUCKET, nextFile.file_url, 3600)
            : null;
          setViewingFileName(nextFile.file_name);
          setViewingFileType(nextFile.file_type);
          setViewingFileUrl(nextUrl);
        }
      } else {
        setViewingFileUrl(null);
        setViewingFileName(null);
        setViewingFileType(null);
      }
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Erro ao excluir arquivo.");
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleViewFile = async (file: {
    id: string;
    file_url: string;
    file_name: string;
    file_type: string;
    created_at: string;
  }) => {
    setSelectedFileId(file.id);
    setFileError(null);

    const cachedUrl = filePreviewUrls[file.id] ?? null;
    if (cachedUrl) {
      setViewingFileName(file.file_name);
      setViewingFileUrl(cachedUrl);
      setViewingFileType(file.file_type);
      return;
    }

    setLoadingFiles(true);
    setViewingFileUrl(null);
    setViewingFileName(null);
    setViewingFileType(null);

    try {
      const fileUrl = await fetchSignedUrl(DOCUMENTS_BUCKET, file.file_url, 3600);
      if (!fileUrl) {
        throw new Error("Não foi possível gerar o link de visualização.");
      }
      setViewingFileName(file.file_name);
      setViewingFileUrl(fileUrl);
      setViewingFileType(file.file_type);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Erro ao gerar link de visualização.");
    } finally {
      setLoadingFiles(false);
    }
  };

  const canModify = userRole === "admin" || userRole === "editor";
  const isLicense = formState.type === "Licença";
  const handleSectionClick = (section: "equipamentos" | "licencas") => {
    setActiveSection(section);
  };

  useEffect(() => {
    if (!activeSection) return;
    const target = document.getElementById(activeSection);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeSection]);

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

    if (!formState.serialNumber.trim()) {
      setCreateError("Número de série é obrigatório.");
      return;
    }

    if (isLicense && !formState.assetId.trim()) {
      setCreateError("Email do responsável é obrigatório para licenças.");
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
    const authorizationPaths: string[] = [];

    for (const authorizationFile of authorizationFiles) {
      if (!allowedTypes.includes(authorizationFile.type.toLowerCase())) {
        setCreateError("Tipo de arquivo inválido. Use PNG, JPEG ou PDF.");
        setSaving(false);
        return;
      }
    }

    setSaving(true);
    setCreateError(null);

    for (const authorizationFile of authorizationFiles) {
      const path = generateStoragePath(
        `autorizacao_${formState.type}_${formState.model}`,
        authorizationFile
      );
      try {
        await uploadToStorage(DOCUMENTS_BUCKET, path, authorizationFile);
        authorizationPaths.push(path);
      } catch (uploadError) {
        setCreateError(
          (uploadError as Error).message || "Erro no upload do arquivo de autorização."
        );
        setSaving(false);
        return;
      }
    }

    const notes = authorizationPaths.length
      ? authorizationPaths.length === 1
        ? `autorizacao:${authorizationPaths[0]}`
        : JSON.stringify({ autorizacoes: authorizationPaths })
      : existingNotes;

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
  const licenseActiveCount = data.licenses.filter((item) => {
    const status = item.equipment_state?.trim().toLowerCase();
    return status?.includes("ativo") || status?.includes("ativa");
  }).length;
  const selectedFile = itemFiles.find((file) => file.id === selectedFileId) ?? null;

  const sortedEquipments = data.equipments
    .slice()
    .sort((left, right) => {
      const leftPerson = normalizePersonName(left.allocated_user || left.responsible);
      const rightPerson = normalizePersonName(right.allocated_user || right.responsible);

      const personOrder = leftPerson.localeCompare(rightPerson, "pt-BR", { sensitivity: "base" });
      if (personOrder !== 0) return personOrder;

      return (left.model || left.asset_id || left.equipment_id || "")
        .toString()
        .localeCompare((right.model || right.asset_id || right.equipment_id || "").toString(), "pt-BR", {
          sensitivity: "base",
        });
    });

  const sortedLicenses = data.licenses
    .slice()
    .sort((left, right) => {
      const leftPerson = normalizePersonName(left.responsible || left.allocated_user);
      const rightPerson = normalizePersonName(right.responsible || right.allocated_user);

      const personOrder = leftPerson.localeCompare(rightPerson, "pt-BR", { sensitivity: "base" });
      if (personOrder !== 0) return personOrder;

      return (left.model || left.asset_id || left.equipment_id || "")
        .toString()
        .localeCompare((right.model || right.asset_id || right.equipment_id || "").toString(), "pt-BR", {
          sensitivity: "base",
        });
    });

  const isViewerWithoutItems =
    userRole === "viewer" &&
    data.totalEquipments === 0 &&
    data.totalLicenses === 0;

  if (isViewerWithoutItems) {
    return (
      <div className="space-y-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-soft">
          <h2 className="text-2xl font-bold text-slate-900">Meu Inventário</h2>
          <p className="mt-3 text-slate-600">
            Não há equipamentos alocados para este usuário.
          </p>
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

      <div className="grid gap-6 xl:grid-cols-2">
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSectionClick("equipamentos")}
          onKeyDown={(event) => event.key === "Enter" && handleSectionClick("equipamentos")}
          className="group block rounded-[2rem] border border-slate-200 bg-slate-50 p-8 text-left shadow-soft transition hover:border-slate-300 hover:bg-slate-100 cursor-pointer"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Equipamentos Alocados</p>
              <h2 className="mt-4 text-5xl font-bold text-slate-950">{data.totalEquipments}</h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">Monitores, desktops e notebooks cadastrados. Clique em um equipamento para abrir os arquivos vinculados.</p>
            </div>
            <div className="rounded-3xl bg-blue-50 px-5 py-4 text-blue-700 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em]">Total</p>
              <p className="mt-2 text-3xl font-semibold">{data.totalEquipments}</p>
            </div>
          </div>

        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSectionClick("licencas")}
          onKeyDown={(event) => event.key === "Enter" && handleSectionClick("licencas")}
          className="group block rounded-[2rem] border border-slate-200 bg-slate-50 p-8 text-left shadow-soft transition hover:border-slate-300 hover:bg-slate-100 cursor-pointer"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Licenças Ativas</p>
              <h2 className="mt-4 text-5xl font-bold text-slate-950">{data.totalLicenses}</h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">Licenças de software vinculadas a você. Clique em uma licença para abrir os arquivos relacionados.</p>
            </div>
            <div className="rounded-3xl bg-emerald-50 px-5 py-4 text-emerald-700 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em]">Ativas</p>
              <p className="mt-2 text-3xl font-semibold">{licenseActiveCount}</p>
            </div>
          </div>

        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="group block rounded-[2rem] border border-slate-200 bg-slate-50 p-8 text-left shadow-soft transition hover:border-slate-300 hover:bg-slate-100">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Equipamentos no Estoque</p>
              <h2 className="mt-4 text-5xl font-bold text-slate-950">-</h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">A quantidade de equipamentos em estoque ainda não está disponível.</p>
            </div>
            <div className="rounded-3xl bg-slate-100 px-5 py-4 text-slate-700 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em]">Disponível em breve</p>
              <p className="mt-2 text-3xl font-semibold">-</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4">

      {activeSection === "equipamentos" && data.equipments && data.equipments.length > 0 && (
        <div id="equipamentos" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
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
                  <th className="px-4 py-3">Alocado para</th>
                  <th className="px-4 py-3">IP/MAC</th>
                  <th className="px-4 py-3">Setor</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedEquipments.map((item) => (
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
                      {item.serial_number || item.equipment_id || item.asset_id || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {item.allocated_user || item.responsible || "-"}
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
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openFileModal(item)}
                          className="rounded px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors"
                        >
                          Arquivos
                        </button>
                        {canModify && (
                          <>
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
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSection === "licencas" && hasLicenses && (
        <div id="licencas" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
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
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedLicenses.map((item) => (
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
                      {item.serial_number || item.equipment_id || item.asset_id || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {item.warranty || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <span className="inline-flex rounded px-2 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700">
                        {item.equipment_state || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openFileModal(item)}
                          className="rounded px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors"
                        >
                          Arquivos
                        </button>
                        {canModify && (
                          <>
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
                          </>
                        )}
                      </div>
                    </td>
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

      {showModal && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-4 py-4 backdrop-blur-sm">
          <div className="flex w-full max-w-3xl max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {editingItemId !== null ? "Editar equipamento / licença" : "Cadastrar novo equipamento / licença"}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
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
                    onChange={(e) => handleInputChange("type", e.target.value)}
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
                    onChange={(e) => handleInputChange("serialNumber", e.target.value)}
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
                    onChange={(e) => handleInputChange("model", e.target.value)}
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
                      onChange={(e) => handleInputChange("responsible", e.target.value)}
                      className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm"
                      placeholder="Ex: João Silva"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Email do responsável</span>
                    <input
                      type="email"
                      value={formState.assetId}
                      onChange={(e) => handleInputChange("assetId", e.target.value)}
                      className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm"
                      placeholder="Ex: nome@empresa.gov.br"
                    />
                  </label>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Responsável (nome completo)</span>
                      <input
                        value={formState.responsible}
                        onChange={(e) => handleInputChange("responsible", e.target.value)}
                        className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm"
                        placeholder="Ex: João Silva"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">ID do ativo</span>
                      <input
                        value={formState.assetId}
                        onChange={(e) => handleInputChange("assetId", e.target.value)}
                        className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm"
                        placeholder="Ex: 12345"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Número do equipamento</span>
                      <input
                        value={formState.equipmentId}
                        onChange={(e) => handleInputChange("equipmentId", e.target.value)}
                        className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm"
                        placeholder="Ex: EQP-001"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">MAC / IP</span>
                      <input
                        value={formState.macIp}
                        onChange={(e) => handleInputChange("macIp", e.target.value)}
                        className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm"
                        placeholder="Ex: 192.168.0.10"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Setor</span>
                      <input
                        value={formState.sector}
                        onChange={(e) => handleInputChange("sector", e.target.value)}
                        className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm"
                        placeholder="Ex: TI"
                      />
                    </label>
                  </div>
                </>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Estado</span>
                  <select
                    value={formState.equipmentState}
                    onChange={(e) => handleInputChange("equipmentState", e.target.value)}
                    className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm"
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
                      className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm"
                      placeholder="Ex: 12 meses"
                    />
                  </label>
                )}
              </div>

              {editingItemId === null && (
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    {isLicense ? "Arquivo de autorização" : "Foto do equipamento"}
                  </span>
                  <FileUploadInput
                    files={authorizationFiles}
                    onFilesChange={handleAuthorizationFilesChange}
                    label={isLicense ? "Envie o(s) arquivo(s) de autorização" : "Envie a(s) foto(s) do equipamento"}
                    accept={"image/png,image/jpeg,image/jpg,application/pdf"}
                    multiple
                    maxFiles={5}
                    maxSize={20 * 1024 * 1024}
                  />
                  <p className="mt-2 text-[11px] text-slate-500">
                    {isLicense
                      ? "Envie PNG, JPG ou PDF para confirmar autorização."
                      : "Envie PNG, JPG ou PDF com a foto do equipamento."}
                  </p>
                </label>
              )}

              {editingItemId !== null && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Arquivos deste item são gerenciados na área <strong>Arquivos</strong>, não na edição.
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="gov-button-secondary-dark rounded-2xl px-4 py-2 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving}
                  className="gov-button rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Salvando..." : editingItemId !== null ? "Salvar alterações" : "Cadastrar item"}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {fileModalOpen && activeItem && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-4 py-4 backdrop-blur-sm">
          <div className="flex w-full max-w-5xl max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Arquivos de {activeItem.type}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Gerencie arquivos vinculados a este item.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeFileModal}
                  className="text-slate-500 transition hover:text-slate-900"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {fileError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {fileError}
                </div>
              )}
              {fileSuccess && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                  {fileSuccess}
                </div>
              )}

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Arquivos existentes</p>
                      <p className="text-[11px] text-slate-500">Mosaico com miniaturas e seleção rápida.</p>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {loadingFiles ? "Carregando..." : `${itemFiles.length} arquivo(s)`}
                    </span>
                  </div>

                  {itemFiles.length === 0 ? (
                    <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
                      Nenhum arquivo encontrado.
                    </div>
                  ) : (
                    <div className="mt-3 grid auto-rows-[96px] grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {itemFiles.map((file, index) => {
                        const isSelected = selectedFileId === file.id;
                        const previewUrl = filePreviewUrls[file.id];

                        return (
                          <div
                            key={file.id}
                            onClick={() => void handleViewFile(file)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => event.key === "Enter" && void handleViewFile(file)}
                            className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${getFileVisualStyle(index, isSelected)}`}
                          >
                            <div className="absolute inset-0">
                              {previewUrl ? (
                                <img
                                  src={previewUrl}
                                  alt={file.file_name}
                                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 p-3 text-white">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="rounded-full bg-white/15 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/90">
                                      {getFileKindLabel(file.file_type, file.file_name)}
                                    </span>
                                    <span className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-medium text-white/75">
                                      {isImageFile(file.file_type) ? "Preview" : "Doc"}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="h-10 w-10 rounded-2xl bg-white/10 ring-1 ring-white/15" />
                                    <p className="mt-2 line-clamp-2 text-xs font-semibold text-white">
                                      {file.file_name}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-transparent p-2 text-white">
                              <p className="line-clamp-1 text-[11px] font-semibold">{file.file_name}</p>
                              <p className="mt-0.5 text-[10px] text-white/75">
                                {new Date(file.created_at).toLocaleString()}
                              </p>
                            </div>

                            {isSelected && (
                              <div className="absolute right-2 top-2 rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-900 shadow-sm">
                                Selecionado
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDeleteFile(file.id);
                              }}
                              className="absolute left-2 top-2 z-30 rounded-full border border-red-300 bg-red-600 px-3 py-1 text-[10px] font-semibold text-white shadow-lg transition hover:bg-red-700"
                              aria-label={`Excluir arquivo ${file.file_name}`}
                            >
                              Excluir
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 text-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 gap-3">
                      <div>
                        <p className="text-sm font-semibold">Pré-visualização</p>
                        <p className="text-[11px] text-white/65">
                          {viewingFileName || "Selecione um arquivo no mosaico"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {viewingFileUrl && (
                          <a
                            href={viewingFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
                          >
                            Abrir
                          </a>
                        )}
                        {selectedFile && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteFile(selectedFile.id)}
                            disabled={loadingFiles}
                            className="rounded-full border border-red-300 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-900 p-3">
                      {viewingFileUrl && viewingFileName ? (
                        viewingFileType?.startsWith("image/") ? (
                          <img
                            src={viewingFileUrl}
                            alt={viewingFileName}
                              className="h-[220px] w-full rounded-2xl object-contain bg-black/20 md:h-[260px] xl:h-[300px]"
                          />
                        ) : viewingFileType === "application/pdf" ? (
                          <object
                            data={viewingFileUrl}
                            type="application/pdf"
                              className="h-[220px] w-full rounded-2xl bg-white md:h-[260px] xl:h-[300px]"
                          >
                              <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center text-sm text-white/70 md:h-[260px] xl:h-[300px]">
                              O navegador não conseguiu renderizar o PDF embutido.
                              <a
                                href={viewingFileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-1 underline"
                              >
                                Abrir o arquivo em nova aba
                              </a>
                            </div>
                          </object>
                        ) : (
                          <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center text-sm text-white/70 md:h-[260px] xl:h-[300px]">
                            Não foi possível renderizar uma pré-visualização rica para este arquivo.
                          </div>
                        )
                      ) : (
                        <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center text-sm text-white/70 md:h-[260px] xl:h-[300px]">
                          Clique em um card do mosaico para abrir o preview aqui.
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
                        buttonClassName="rounded-2xl border border-blue-600 bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:border-blue-700"
                      />
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={closeFileModal}
                        className="gov-button-secondary-dark rounded-2xl px-4 py-2 text-sm font-semibold"
                      >
                        Fechar
                      </button>
                      <button
                        type="button"
                        onClick={handleFileUpload}
                        disabled={loadingFiles || fileUploadFiles.length === 0}
                        className="gov-button rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loadingFiles ? "Enviando..." : "Enviar arquivos"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 shadow-sm">
                    Clique em um card para trocar o preview. Imagens aparecem como miniaturas; PDFs entram no painel de leitura.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  </div>
  );
}
