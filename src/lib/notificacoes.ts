import type { Notificacao } from "@/types/dashboard";
import { fetchJson, postJson } from "@/lib/api";

export const fetchNotificacoesApi = async () => fetchJson<Notificacao[]>("/api/notificacoes");

export const createNotificacaoApi = async (body: Omit<Notificacao, "id" | "created_at">) =>
  postJson<Notificacao>("/api/notificacoes", body);

export const markNotificacoesLidasApi = async () =>
  fetchJson<{ success: true }>("/api/notificacoes", { method: "PATCH" });
