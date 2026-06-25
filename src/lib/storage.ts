import { fetchJson, getAuthToken } from "@/lib/api";
const STORAGE_API = "/api/storage";

export const DOCUMENTS_BUCKET = "documentos";
export const PREVIEWS_BUCKET = "previews";

export const VIEWER_PUBLIC_GOV_LINK =
  "https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis";
export const VIEWER_PUBLIC_PREVIEW_IMAGE = "/gov-preview.svg";
export const BIMUNIS_PREVIEW_IMAGE = "/bimunis.png";

export const ALLOWED_PREVIEW_TYPES = ["image/png", "image/jpeg", "image/jpg"];
export const ALLOWED_DOCUMENT_EXTENSIONS = [
  "pdf",
  "xlsx",
  "xls",
  "docx",
  "doc",
  "pptx",
  "ppt",
  "pbix",
];

export const PREVIEW_ACCEPT = ALLOWED_PREVIEW_TYPES.join(",");
export const DOCUMENT_ACCEPT = ALLOWED_DOCUMENT_EXTENSIONS.map((ext) => `.${ext}`).join(",");

export interface EquipmentFileRecord {
  id: string;
  equipment_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  created_at: string;
}

export interface LicenseFileRecord {
  id: string;
  license_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  created_at: string;
}

export const listEquipmentFiles = async (equipmentId: string) => {
  return fetchJson<EquipmentFileRecord[]>(`/api/equipments/${encodeURIComponent(equipmentId)}/files`);
};

export const uploadEquipmentFiles = async (equipmentId: string, files: File[]) => {
  if (!files.length) {
    throw new Error("Nenhum arquivo selecionado.");
  }

  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await fetchJson<{ files: EquipmentFileRecord[] }>(
    `/api/equipments/${encodeURIComponent(equipmentId)}/files`,
    {
      method: "POST",
      body: formData,
    }
  );

  return response.files;
};

export const deleteEquipmentFile = async (equipmentId: string, fileId: string) => {
  return fetchJson<{ deleted: boolean; remainingFiles: EquipmentFileRecord[] }>(
    `/api/equipments/${encodeURIComponent(equipmentId)}/files/${encodeURIComponent(fileId)}`,
    { method: "DELETE" }
  );
};

export const listLicenseFiles = async (licenseId: string) => {
  return fetchJson<LicenseFileRecord[]>(`/api/licenses/${encodeURIComponent(licenseId)}/files`);
};

export const uploadLicenseFiles = async (licenseId: string, files: File[]) => {
  if (!files.length) {
    throw new Error("Nenhum arquivo selecionado.");
  }

  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await fetchJson<{ files: LicenseFileRecord[] }>(
    `/api/licenses/${encodeURIComponent(licenseId)}/files`,
    {
      method: "POST",
      body: formData,
    }
  );

  return response.files;
};

export const deleteLicenseFile = async (licenseId: string, fileId: string) => {
  return fetchJson<{ deleted: boolean; remainingFiles: LicenseFileRecord[] }>(
    `/api/licenses/${encodeURIComponent(licenseId)}/files/${encodeURIComponent(fileId)}`,
    { method: "DELETE" }
  );
};

export const generateStoragePath = (name: string, file: File, suffix = "") => {
  const ext = file.name.split(".").pop() ?? "";
  const nomeSeguro = name
    .normalize("NFD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  return `${Date.now()}_${nomeSeguro}${suffix}.${ext}`;
};

const parseStorageError = async (res: Response) => {
  const errorData = await res.json().catch(() => null);
  return errorData?.error || `Erro no storage (${res.status}).`;
};

export const uploadToStorage = async (bucket: string, path: string, file: File) => {
  const token = await getAuthToken();
  if (!token) throw new Error("Token não fornecido");

  const formData = new FormData();
  formData.append("bucket", bucket);
  formData.append("path", path);
  formData.append("file", file);

  const res = await fetch(STORAGE_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await parseStorageError(res));
  }

  return true;
};

export const deleteFromStorage = async (bucket: string, path: string) => {
  const token = await getAuthToken();
  if (!token) throw new Error("Token não fornecido");

  const res = await fetch(STORAGE_API, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ bucket, path }),
  });

  if (!res.ok) {
    throw new Error(await parseStorageError(res));
  }

  return true;
};

export const fetchSignedUrl = async (
  bucket: string,
  path: string,
  expires = 3600
) => {
  const token = await getAuthToken();

  const res = await fetch(
    `${STORAGE_API}?type=signed&bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}&expires=${expires}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(await parseStorageError(res));
  }

  const response = await res.json();
  return response.data?.signedUrl as string | null;
};

export const fetchPublicUrl = async (
  bucket: string,
  path: string
) => {
  const token = await getAuthToken();

  const res = await fetch(
    `${STORAGE_API}?type=public&bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(await parseStorageError(res));
  }

  const response = await res.json();
  return response.data?.publicUrl as string | null;
};

export const resolveDocumentViewerUrl = async (
  bucket: string,
  path: string
) => {
  const signedUrl = await fetchSignedUrl(bucket, path, 86400);
  if (!signedUrl) {
    return null;
  }

  const ext = path.split(".").pop()?.toLowerCase();
  if (["xlsx", "xls", "docx", "doc", "pptx", "ppt"].includes(ext ?? "")) {
    return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(signedUrl)}`;
  }

  return signedUrl;
};
