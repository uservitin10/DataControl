import type { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { POST as createServiceOrder } from "../../app/api/contratos/[id]/ordens-servico/route";
import { POST as createMonthlyEntry } from "../../app/api/contratos/[id]/ordens-servico/[ordemId]/lancamentos/route";

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock("@/lib/api-guard", () => ({
  withAuth: jest.fn(async (_request, handler) =>
    handler({ id: "editor-1", role: "editor", email: "editor@example.test", nome: "Editor" })
  ),
}));

jest.mock("@/lib/audit", () => ({ addAuditLog: jest.fn() }));

const poolQueryMock = pool.query as jest.Mock;
const withAuthMock = withAuth as jest.Mock;

describe("contract closed write routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects an editor adding a service order when every existing order has expired", async () => {
    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: "contract-1", name: "Contrato" }] })
      .mockResolvedValueOnce({ rows: [{ isClosed: true }] });
    const request = {
      json: async () => ({
        siafNumber: "03101.000975/2025-54",
        seiDocumentNumber: "50465842",
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
        serviceDescription: "Serviços de teste.",
      }),
    } as unknown as NextRequest;

    const response = await createServiceOrder(request, {
      params: Promise.resolve({ id: "contract-1" }),
    });

    expect(response.status).toBe(409);
    expect(poolQueryMock).toHaveBeenCalledTimes(2);
    expect(withAuthMock).toHaveBeenCalledWith(request, expect.any(Function), ["admin", "editor"]);
  });

  it("rejects an editor adding a monthly entry when every existing order has expired", async () => {
    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: "order-1", contract_id: "contract-1", siaf_number: "SIAF-1" }] })
      .mockResolvedValueOnce({ rows: [{ isClosed: true }] });
    const request = {
      json: async () => ({
        paymentProcessNumber: "03101.001662/2025-13",
        monthlyPaidValue: "1000",
        glosasValue: "0",
        referenceMonth: "2026-10",
        executionSummary: "Execução mensal.",
        empenho: "2026NE000001",
      }),
    } as unknown as NextRequest;

    const response = await createMonthlyEntry(request, {
      params: Promise.resolve({ id: "contract-1", ordemId: "order-1" }),
    });

    expect(response.status).toBe(409);
    expect(poolQueryMock).toHaveBeenCalledTimes(2);
    expect(withAuthMock).toHaveBeenCalledWith(request, expect.any(Function), ["admin", "editor"]);
  });

  it("allows an admin to add a service order to a closed contract", async () => {
    withAuthMock.mockImplementationOnce(async (_request, handler) =>
      handler({ id: "admin-1", role: "admin", email: "admin@example.test", nome: "Admin" })
    );
    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: "contract-1", name: "Contrato" }] })
      .mockResolvedValueOnce({ rows: [{ isClosed: true }] })
      .mockResolvedValueOnce({ rows: [{ id: "order-2", siafNumber: "03101.000975/2025-54" }] });
    const request = {
      json: async () => ({
        siafNumber: "03101.000975/2025-54",
        seiDocumentNumber: "50465842",
        validFrom: "2025-05-12",
        validTo: "2025-12-31",
        serviceDescription: "Serviços de teste.",
      }),
    } as unknown as NextRequest;

    const response = await createServiceOrder(request, {
      params: Promise.resolve({ id: "contract-1" }),
    });

    expect(response.status).toBe(201);
    expect(poolQueryMock).toHaveBeenCalledTimes(2);
  });

  it("allows an admin to add a monthly entry to a closed contract", async () => {
    withAuthMock.mockImplementationOnce(async (_request, handler) =>
      handler({ id: "admin-1", role: "admin", email: "admin@example.test", nome: "Admin" })
    );
    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: "order-1", contract_id: "contract-1", siaf_number: "SIAF-1" }] })
      .mockResolvedValueOnce({ rows: [{ isClosed: true }] })
      .mockResolvedValueOnce({ rows: [{ id: "entry-1" }] });
    const request = {
      json: async () => ({
        paymentProcessNumber: "03101.001662/2025-13",
        monthlyPaidValue: "1000",
        glosasValue: "0",
        referenceMonth: "2025-10",
        executionSummary: "Execução mensal.",
        empenho: "2025NE000001",
      }),
    } as unknown as NextRequest;

    const response = await createMonthlyEntry(request, {
      params: Promise.resolve({ id: "contract-1", ordemId: "order-1" }),
    });

    expect(response.status).toBe(201);
    expect(poolQueryMock).toHaveBeenCalledTimes(2);
  });
});