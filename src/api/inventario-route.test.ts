import type { NextRequest } from "next/server";
import { GET } from "../../app/api/inventario/route";
import { withAuth } from "@/lib/api-guard";

jest.mock("@/lib/api-guard", () => ({
  withAuth: jest.fn((req, handler, requirement) => handler({
    id: "user-1",
    role: "inventario_editor",
    email: "inventario@teste.com",
    nome: "Editor Inventário",
  })),
}));

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    query: jest.fn().mockResolvedValue({
      rows: [
        { id: "item-1", type: "Desktop", sector: "Financeiro" },
        { id: "item-2", type: "Licença", sector: "Financeiro" },
      ],
    }),
  },
}));

const withAuthMock = withAuth as jest.Mock;

describe("app/api/inventario/route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("permite acesso ao inventário geral para quem tem permissão de visualização do módulo", async () => {
    const request = {
      url: "http://localhost/api/inventario",
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(withAuthMock).toHaveBeenCalledWith(
      request,
      expect.any(Function),
      { module: "inventario", action: "view" }
    );
  });
});
