import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import pool from "@/lib/db";
import { auth } from "@/auth";
import { GET, POST } from "../../app/api/audit/route";

vi.mock("@/lib/db", () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

const poolQueryMock = vi.mocked(pool.query);
const authMock = vi.mocked(auth);

describe("app/api/audit/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns audit logs successfully", async () => {
    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ count: "1" }] } as never)
      .mockResolvedValueOnce({ rows: [{ id: "log-1" }] } as never);

    const request = {
      nextUrl: new URL("http://localhost/api/audit?limit=2&offset=0"),
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [{ id: "log-1" }], missingTable: false, count: 1 });
  });

  it("GET returns empty array when audit table is missing", async () => {
    poolQueryMock.mockRejectedValue(new Error('relation "audit_logs" does not exist'));

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

  it("POST includes user id from session and returns created row", async () => {
    authMock.mockResolvedValue({ user: { id: "user-123" } } as never);
    poolQueryMock.mockResolvedValue({ rows: [{ id: "log-2" }] } as never);

    const request = {
      json: async () => ({ action: "create_audit", resource_type: "audit", details: "ok" }),
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "log-2" });
    expect(authMock).toHaveBeenCalled();
  });

  it("POST returns missingTable when audit table is not configured", async () => {
    poolQueryMock.mockRejectedValue(new Error('relation "audit_logs" does not exist'));

    const request = {
      json: async () => ({ action: "create_audit", resource_type: "audit", details: "ok" }),
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "Audit logging não está configurado. Crie a tabela audit_logs no banco de dados.",
      missingTable: true,
    });
  });
});
