import type { NextRequest } from "next/server";
import pool from "@/lib/db";
import { POST } from "../../app/api/contratos/[id]/ordens-servico/[ordemId]/baixas-anuais/route";

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock("@/lib/api-guard", () => ({
  withAuth: jest.fn(async (_request, handler) =>
    handler({ id: "admin-1", role: "admin", email: "admin@example.test", nome: "Admin" })
  ),
}));

jest.mock("@/lib/audit", () => ({ addAuditLog: jest.fn() }));

const poolQueryMock = pool.query as jest.Mock;

describe("annual contract entries route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a fiscal-year entry for an annual contract", async () => {
    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ siafNumber: "14", paymentFrequency: "annual" }] })
      .mockResolvedValueOnce({ rows: [{ id: "annual-entry-1", fiscalYear: 2026 }] });
    const request = {
      json: async () => ({
        paymentProcessNumber: "03101.003275/2025-11",
        annualPaidValue: "1170200.00",
        glosasValue: "0",
        fiscalYear: 2026,
        executionSummary: "Execução anual Gartner.",
      }),
    } as unknown as NextRequest;

    const response = await POST(request, {
      params: Promise.resolve({ id: "contract-1", ordemId: "order-14" }),
    });

    expect(response.status).toBe(201);
    expect(poolQueryMock).toHaveBeenCalledTimes(2);
    expect(poolQueryMock.mock.calls[1][0]).toContain("INSERT INTO public.contract_annual_entries");
  });

  it("rejects an annual entry for a monthly contract", async () => {
    poolQueryMock.mockResolvedValueOnce({ rows: [{ siafNumber: "OS-1", paymentFrequency: "monthly" }] });
    const request = {
      json: async () => ({
        paymentProcessNumber: "03101.003275/2025-11",
        annualPaidValue: "1170200.00",
        glosasValue: "0",
        fiscalYear: 2026,
        executionSummary: "Execução anual.",
      }),
    } as unknown as NextRequest;

    const response = await POST(request, {
      params: Promise.resolve({ id: "contract-1", ordemId: "order-1" }),
    });

    expect(response.status).toBe(409);
    expect(poolQueryMock).toHaveBeenCalledTimes(1);
  });
});