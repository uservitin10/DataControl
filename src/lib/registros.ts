import type { Registro } from "@/types/dashboard";
import { fetchJson, postJson, patchJson } from "@/lib/api";

interface ApiEnvelope<T> {
  success: true;
  data: T;
}

export const fetchRegistrosApi = async () => {
  const res = await fetchJson<ApiEnvelope<Registro[]>>("/api/registros");
  return res.data;
};

export const createRegistroApi = async (body: Partial<Registro>) => {
  const res = await postJson<ApiEnvelope<Registro>>("/api/registros", body);
  return res.data;
};

export const updateRegistroApi = async (id: string, body: Partial<Registro>) => {
  const res = await patchJson<ApiEnvelope<Registro>>(`/api/registros/${encodeURIComponent(id)}`, body);
  return res.data;
};

export const deleteRegistroApi = async (id: string) =>
  fetchJson<{ success: true }>(`/api/registros/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });