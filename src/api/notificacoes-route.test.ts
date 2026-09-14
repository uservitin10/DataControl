import type { NextRequest } from "next/server";
import pool from "@/lib/db";
import { addAuditLog } from "@/lib/audit";
import { GET, POST, PATCH, DELETE } from "../../app/api/notificacoes/route";

type MockUser = {
  id: string;
  nome: string;
};

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

jest.mock("@/lib/api-guard", () => ({
  __esModule: true,
  withAuth: jest.fn((request: unknown, callback: (user: MockUser) => Promise<unknown>) => callback({ id: "user-1", nome: "Teste" })),
}));

jest.mock("@/lib/audit", () => ({
  __esModule: true,
  addAuditLog: jest.fn(() => Promise.resolve({ success: true })),
}));

const poolQueryMock = pool.query as jest.Mock;
const addAuditLogMock = addAuditLog as jest.Mock;

describe("app/api/notificacoes/route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET returns notifications when the query succeeds", async () => {
    poolQueryMock.mockResolvedValue({ rows: [{ id: "notif-1" }] } as never);

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
    poolQueryMock.mockResolvedValue({ rows: [{ id: "notif-1" }] } as never);

    const request = {
      json: async () => ({ tipo: "alerta", mensagem: "Teste", lida: false }),
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true, data: [{ id: "notif-1" }] });
    expect(addAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-1", action: "create_notification" }));
  });

  it("PATCH marks all notifications as read and writes an audit log", async () => {
    poolQueryMock.mockResolvedValue({ rows: [] } as never);

    const response = await PATCH({} as unknown as NextRequest);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: { success: true } });
    expect(addAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-1", action: "mark_notifications_read" }));
  });

  it("DELETE removes a notification and writes an audit log", async () => {
    poolQueryMock.mockResolvedValue({ rowCount: 1 } as never);

    const request = {
      nextUrl: { searchParams: new URLSearchParams("id=notif-1") },
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await DELETE(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: { success: true } });
    expect(addAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-1", action: "delete_notification" }));
  });
});
