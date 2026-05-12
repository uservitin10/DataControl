import type { Sistema } from "@/src/types/dashboard";
import { fetchJson, postJson, patchJson } from "@/src/lib/api";

export const fetchSistemasApi = async () => fetchJson<Sistema[]>("/api/sistemas");

export const createSistemaApi = async (body: Partial<Sistema>) => postJson<Sistema>("/api/sistemas", body);

export const updateSistemaApi = async (id: string, body: Partial<Sistema>) =>
  patchJson<Sistema>(`/api/sistemas/${encodeURIComponent(id)}`, body);

export const deleteSistemaApi = async (id: string) =>
  fetchJson<{ success: true }>(`/api/sistemas/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
