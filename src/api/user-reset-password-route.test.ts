import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { POST } from "../../app/api/usuarios/[id]/reset-password/route";

jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: { hash: jest.fn() },
}));

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock("@/lib/api-guard", () => ({
  withAuth: jest.fn(async (_req, handler) => handler({ id: "admin-1", role: "admin" })),
}));

jest.mock("@/lib/audit", () => ({ addAuditLog: jest.fn() }));

const poolQueryMock = pool.query as jest.Mock;
const poolConnectMock = pool.connect as jest.Mock;
const withAuthMock = withAuth as jest.Mock;
const bcryptHashMock = bcrypt.hash as jest.Mock;

describe("app/api/usuarios/[id]/reset-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bcryptHashMock.mockResolvedValue("hashed-new-password");
  });

  it("allows admins to set a new password without sending email", async () => {
    poolQueryMock.mockResolvedValueOnce({ rows: [{ id: "user-1", email: "user@example.gov.br" }] });
    const clientQueryMock = jest.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const releaseMock = jest.fn();
    poolConnectMock.mockResolvedValue({ query: clientQueryMock, release: releaseMock });
    const request = {
      json: async () => ({ password: "new-password-123" }),
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: "user-1" }) });

    expect(response.status).toBe(200);
    expect(withAuthMock).toHaveBeenCalledWith(request, expect.any(Function), ["admin"]);
    expect(bcryptHashMock).toHaveBeenCalledWith("new-password-123", 10);
    expect(clientQueryMock).toHaveBeenCalledWith(
      expect.stringContaining("password_hash = $1"),
      ["hashed-new-password", "user-1"]
    );
    expect(clientQueryMock).toHaveBeenCalledWith(
      expect.stringContaining("password_reset_tokens SET used = true"),
      ["user-1"]
    );
    expect(releaseMock).toHaveBeenCalled();
    expect(addAuditLog).toHaveBeenCalled();
  });

  it("rejects passwords shorter than six characters", async () => {
    const request = {
      json: async () => ({ password: "123" }),
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: "user-1" }) });

    expect(response.status).toBe(400);
    expect(poolQueryMock).not.toHaveBeenCalled();
    expect(poolConnectMock).not.toHaveBeenCalled();
  });

  it("returns not found for an unknown profile", async () => {
    poolQueryMock.mockResolvedValueOnce({ rows: [] });
    const request = {
      json: async () => ({ password: "new-password-123" }),
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: "missing" }) });

    expect(response.status).toBe(404);
    expect(poolConnectMock).not.toHaveBeenCalled();
  });
});