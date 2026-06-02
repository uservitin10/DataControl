import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET, POST, PATCH } from "../../app/api/notificacoes/route";
import { supabaseServer } from "@/lib/supabase-server";
import { addAuditLog } from "@/lib/audit";
import type { NextRequest } from "next/server";

vi.mock("@/lib/api-guard", () => ({
  withAuth: vi.fn((request: unknown, callback: (user: any) => Promise<unknown>) => callback({ id: "user-1", nome: "Teste" })),
}));

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: {
    from: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  addAuditLog: vi.fn(() => Promise.resolve({ success: true })),
}));

describe("app/api/notificacoes/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns notifications when supabase query succeeds", async () => {
    const limit = vi.fn().mockResolvedValue({ data: [{ id: "notif-1" }], error: null });
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    (supabaseServer as any).from = vi.fn(() => ({ select }));

    const response = await GET({} as unknown as NextRequest);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: [{ id: "notif-1" }] });
  });

  it("POST returns validation error when payload is invalid", async () => {
    const request = {
      json: async () => ({ tipo: "alerta" }),
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: "O campo 'mensagem' é obrigatório." });
  });

  it("POST creates a notification and writes an audit log", async () => {
    const insert = vi.fn().mockResolvedValue({ data: [{ id: "notif-1" }], error: null });
    (supabaseServer as any).from = vi.fn(() => ({ insert }));

    const request = {
      json: async () => ({ tipo: "alerta", mensagem: "Teste", lida: false }),
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true, data: [{ id: "notif-1" }] });
    expect(addAuditLog).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-1", action: "create_notification" }));
  });

  it("PATCH marks all notifications as read and writes an audit log", async () => {
    const eq = vi.fn().mockResolvedValue({ data: [{ id: "notif-1" }], error: null });
    const update = vi.fn(() => ({ eq }));
    (supabaseServer as any).from = vi.fn(() => ({ update }));

    const response = await PATCH({} as unknown as NextRequest);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: { success: true } });
    expect(addAuditLog).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-1", action: "mark_notifications_read" }));
  });
});
