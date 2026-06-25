import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET, POST } from "../../app/api/audit/route";
import { supabaseServer } from "@/lib/supabase-server";
import type { NextRequest } from "next/server";

type SupabaseSelectResult = {
  data: Array<{ id: string }> | null;
  error: null | { code: string; message: string };
  count: number | null;
};

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe("app/api/audit/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const supabaseFromMock = vi.mocked(supabaseServer.from);
  const supabaseGetUserMock = vi.mocked(supabaseServer.auth.getUser);

  it("GET returns audit logs successfully", async () => {
    const range = vi.fn().mockResolvedValue({ data: [{ id: "log-1" }], error: null, count: 1 } as SupabaseSelectResult);
    const order = vi.fn(() => ({ range }));
    const select = vi.fn(() => ({ order }));
    supabaseFromMock.mockImplementation(() => ({ select }) as any);

    const request = {
      nextUrl: new URL("http://localhost/api/audit?limit=2&offset=0"),
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [{ id: "log-1" }], missingTable: false, count: 1 });
  });

  it("GET returns empty array when audit table is missing", async () => {
    const range = vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST205", message: "Could not find the table 'public.audit_logs'" }, count: null } as SupabaseSelectResult);
    const order = vi.fn(() => ({ range }));
    const select = vi.fn(() => ({ order }));
    supabaseFromMock.mockImplementation(() => ({ select }) as any);

    const request = {
      nextUrl: new URL("http://localhost/api/audit"),
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [], missingTable: true, count: 0 });
  });

  it("POST returns 400 when action is missing", async () => {
    const request = {
      json: async () => ({ user_id: "user-1" }),
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "action é obrigatório" });
  });

  it("POST includes user id from bearer token and returns created row", async () => {
    const authGetUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-123" } } });
    supabaseGetUserMock.mockImplementation(authGetUser);

    const single = vi.fn().mockResolvedValue({ data: { id: "log-2" }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    supabaseFromMock.mockImplementation(() => ({ insert }) as any);

    const request = {
      json: async () => ({ action: "create_audit", resource_type: "audit", details: "ok" }),
      headers: new Headers([
        ["authorization", "Bearer token"],
      ]),
    } as unknown as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "log-2" });
    expect(authGetUser).toHaveBeenCalledWith("token");
  });

  it("POST returns missingTable when audit table is not configured", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST205", message: "Could not find the table 'public.audit_logs'" } });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    supabaseFromMock.mockImplementation(() => ({ insert }) as any);

    const request = {
      json: async () => ({ action: "create_audit", resource_type: "audit", details: "ok" }),
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "Audit logging não está configurado. Crie a tabela audit_logs no Supabase.",
      missingTable: true,
    });
  });
});
