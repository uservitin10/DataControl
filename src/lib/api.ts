export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

const parseError = async (res: Response) => {
  const data = await res.json().catch(() => null);
  return data?.error || `Erro na requisição (${res.status}).`;
};

export async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  return fetchJson<T>(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function patchJson<T>(url: string, body: unknown): Promise<T> {
  return fetchJson<T>(url, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
export interface AuditEventPayload {
  user_id: string | null;
  action: string;
  resource_type: string;
  details?: string;
}

export const logAuditEvent = async (payload: AuditEventPayload) => {
  return postJson<{ success: true }>("/api/audit", payload);
};