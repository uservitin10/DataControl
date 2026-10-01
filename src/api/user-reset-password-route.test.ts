import type { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { sendPasswordResetEmail } from "@/lib/email";
import { POST } from "../../app/api/usuarios/[id]/reset-password/route";

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

jest.mock("@/lib/api-guard", () => ({
  withAuth: jest.fn(async (_req, handler) => handler({ id: "admin-1", role: "admin" })),
}));

jest.mock("@/lib/audit", () => ({ addAuditLog: jest.fn() }));
jest.mock("@/lib/email", () => ({ sendPasswordResetEmail: jest.fn() }));

const poolQueryMock = pool.query as jest.Mock;
const withAuthMock = withAuth as jest.Mock;
const sendPasswordResetEmailMock = sendPasswordResetEmail as jest.Mock;

describe("app/api/usuarios/[id]/reset-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AUTH_URL = "https://horus.example.gov.br";
    sendPasswordResetEmailMock.mockResolvedValue(undefined);
  });

  it("allows only admins and sends a one-hour reset link", async () => {
    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: "user-1", email: "user@example.gov.br" }] })
      .mockResolvedValueOnce({ rows: [] });
    const request = {
      nextUrl: { origin: "https://horus.example.gov.br" },
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: "user-1" }) });

    expect(response.status).toBe(200);
    expect(withAuthMock).toHaveBeenCalledWith(request, expect.any(Function), ["admin"]);
    expect(poolQueryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("NOW() + interval '1 hour'"),
      ["user-1", expect.any(String)]
    );
    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(
      "user@example.gov.br",
      expect.stringMatching(/^https:\/\/horus\.example\.gov\.br\/login\/reset\?token=/)
    );
    expect(addAuditLog).toHaveBeenCalled();
  });

  it("returns not found for an unknown profile", async () => {
    poolQueryMock.mockResolvedValueOnce({ rows: [] });
    const request = {
      nextUrl: { origin: "https://horus.example.gov.br" },
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: "missing" }) });

    expect(response.status).toBe(404);
    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
  });
});