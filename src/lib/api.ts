import { supabase } from "@/lib/supabase";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const parseJsonResponse = async (res: Response) => {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error || `Erro na requisição (${res.status}).`;
    throw new Error(message);
  }
  return data;
};

/**
 * Obtém o token de autenticação do Supabase
 */
const getAuthToken = async (): Promise<string | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

/**
 * Cria headers com autenticação
 */
const createAuthHeaders = async (headers: HeadersInit = {}): Promise<HeadersInit> => {
  const token = await getAuthToken();
  const headersObj = {
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return headersObj;
};

/**
 * Extrai dados da resposta padronizada da API
 */
const extractApiData = <T>(response: any): T => {
  // Se a resposta tem a estrutura padronizada { success, data }
  if (response && typeof response === "object" && "success" in response) {
    return response.data ?? response;
  }
  // Caso contrário, retorna como está
  return response;
};

export const fetchJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const headers = await createAuthHeaders(init?.headers);
  const res = await fetch(input, { ...init, headers });
  const data = await parseJsonResponse(res);
  return extractApiData<T>(data);
};

export const postJson = async <T>(input: RequestInfo, body: unknown): Promise<T> => {
  const headers = await createAuthHeaders({ "Content-Type": "application/json" });
  const res = await fetch(input, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await parseJsonResponse(res);
  return extractApiData<T>(data);
};

export const patchJson = async <T>(input: RequestInfo, body: unknown): Promise<T> => {
  const headers = await createAuthHeaders({ "Content-Type": "application/json" });
  const res = await fetch(input, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  const data = await parseJsonResponse(res);
  return extractApiData<T>(data);
};

export type AuditLogPayload = {
  user_id: string | null;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  details?: string | null;
  ip_address?: string | null;
};

export const logAuditEvent = async (payload: AuditLogPayload): Promise<unknown> => {
  const res = await fetch("/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.error || `Erro ao gravar log de auditoria (${res.status}).`);
  }
  return await res.json();
};
