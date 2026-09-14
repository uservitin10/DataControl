import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { POST } from "../../app/api/usuarios/route";

jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
  },
}));

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

jest.mock("@/lib/api-guard", () => ({
  withAuth: async (_req: unknown, handler: (user: { id: string; role: string; email: string; nome: string }) => Promise<Response>, _requirements?: unknown) => {
    return handler({ id: "admin-1", role: "admin", email: "admin@teste.com", nome: "Admin" });
  },
}));

const poolQueryMock = pool.query as jest.Mock;
const bcryptHashMock = bcrypt.hash as jest.Mock;

describe("app/api/usuarios/route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("POST cria um usuário novo com role persistida em profiles", async () => {
    bcryptHashMock.mockResolvedValue("hashed-password");
    poolQueryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "new-user-1", email: "novo@teste.com", display_name: "Novo Usuário", role: "editor" }] });

    const request = {
      json: async () => ({
        email: "novo@teste.com",
        display_name: "Novo Usuário",
        password: "senha123",
        role: "editor",
      }),
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        id: "new-user-1",
        email: "novo@teste.com",
        display_name: "Novo Usuário",
        role: "editor",
      },
    });
    expect(poolQueryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO profiles"),
      expect.arrayContaining([expect.any(String), "novo@teste.com", "Novo Usuário", "editor", "hashed-password"])
    );
  });
});
