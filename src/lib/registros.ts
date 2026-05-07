import type { Registro } from "@/src/types/dashboard";
import { fetchJson, postJson, patchJson } from "@/src/lib/api";

export const fetchRegistrosApi = async () => fetchJson<Registro[]>("/api/registros");

export const createRegistroApi = async (body: Partial<Registro>) => postJson<Registro>("/api/registros", body);

export const updateRegistroApi = async (id: string, body: Partial<Registro>) =>
  patchJson<Registro>(`/api/registros/${encodeURIComponent(id)}`, body);

export const deleteRegistroApi = async (id: string) =>
  fetchJson<{ success: true }>(`/api/registros/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
