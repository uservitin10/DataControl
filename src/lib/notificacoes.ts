import type { Notificacao } from "@/types/dashboard";
import { fetchJson, postJson } from "@/lib/api";

export const fetchNotificacoesApi = async () => {
  const response = await fetchJson<{ success: boolean; data: Notificacao[] }>("/api/notificacoes");
  return response.data;
};

export const createNotificacaoApi = async (body: Omit<Notificacao, "id" | "created_at">) =>
  postJson<Notificacao>("/api/notificacoes", body);

export const markNotificacoesLidasApi = async () =>
  fetchJson<{ success: true }> ("/api/notificacoes", { method: "PATCH" });

export const deleteNotificacaoApi = async (id: string) =>
  fetchJson<{ success: true }>(`/api/notificacoes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
