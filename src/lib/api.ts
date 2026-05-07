const parseJsonResponse = async (res: Response) => {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error || `Erro na requisição (${res.status}).`;
    throw new Error(message);
  }
  return data;
};

export const fetchJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const res = await fetch(input, init);
  return await parseJsonResponse(res);
};

export const postJson = async <T>(input: RequestInfo, body: unknown): Promise<T> => {
  const res = await fetch(input, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await parseJsonResponse(res);
};

export const patchJson = async <T>(input: RequestInfo, body: unknown): Promise<T> => {
  const res = await fetch(input, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await parseJsonResponse(res);
};
