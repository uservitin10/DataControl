import { supabase } from "@/src/lib/supabase";

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

export const fetchJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const headers = await createAuthHeaders(init?.headers);
  const res = await fetch(input, { ...init, headers });
  return await parseJsonResponse(res);
};

export const postJson = async <T>(input: RequestInfo, body: unknown): Promise<T> => {
  const headers = await createAuthHeaders({ "Content-Type": "application/json" });
  const res = await fetch(input, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return await parseJsonResponse(res);
};

export const patchJson = async <T>(input: RequestInfo, body: unknown): Promise<T> => {
  const headers = await createAuthHeaders({ "Content-Type": "application/json" });
  const res = await fetch(input, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  return await parseJsonResponse(res);
};
