import type { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { POST } from "../../app/api/contratos/route";

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

const poolConnectMock = pool.connect as jest.Mock;
const poolQueryMock = pool.query as jest.Mock;
const withAuthMock = withAuth as jest.Mock;
const addAuditLogMock = addAuditLog as jest.Mock;

describe("app/api/contratos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("cria contrato e primeiro lançamento numa transação para admin/editor", async () => {
    const clientQuery = jest.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "contract-1" }] })
      .mockResolvedValueOnce({ rows: [{ id: "order-1" }] })
      .mockResolvedValueOnce({ rows: [{ id: "entry-1" }] })
      .mockResolvedValueOnce({ rows: [] });
    const release = jest.fn();
    poolConnectMock.mockResolvedValue({ query: clientQuery, release });
    poolQueryMock
      .mockResolvedValueOnce({ rows: [{
        id: "contract-1",
        name: "Contrato de teste",
        totalValue: "12000.50",
        executionSummary: "Execução contratual.",
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      }] })
      .mockResolvedValueOnce({ rows: [{
        id: "order-1",
        contractId: "contract-1",
        serviceOrderNumber: "OS-123",
        internalNumber: "INT-123",
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
        serviceDescription: "Serviços de teste.",
        addendumNumber: null,
        addendumValidFrom: null,
        addendumValidTo: null,
      }] })
      .mockResolvedValueOnce({ rows: [{
        id: "entry-1",
        serviceOrderId: "order-1",
        paymentProcessNumber: "SEI-123",
        monthlyPaidValue: "1000.00",
        monthlyNetValue: "1000.00",
        glosasValue: "0.00",
        referenceMonth: "2026-10",
        executionSummary: "Execução mensal.",
        empenho: "2026NE1",
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      }] })
      .mockResolvedValueOnce({ rows: [] });
    const request = {
      json: async () => ({
        name: "Contrato de teste",
        totalValue: "12000.50",
        executionSummary: "Execução contratual.",
        initialServiceOrder: {
          serviceOrderNumber: "OS-123",
          internalNumber: "INT-123",
          validFrom: "2026-01-01",
          validTo: "2026-12-31",
          serviceDescription: "Serviços de teste.",
        },
        initialEntry: {
          paymentProcessNumber: "SEI-123",
          monthlyPaidValue: "1000",
          glosasValue: "0",
          referenceMonth: "2026-10",
          executionSummary: "Execução mensal.",
          empenho: "2026NE1",
        },
      }),
    } as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(withAuthMock).toHaveBeenCalledWith(request, expect.any(Function), ["admin", "editor"]);
    expect(clientQuery).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(clientQuery).toHaveBeenNthCalledWith(5, "COMMIT");
    expect(release).toHaveBeenCalled();
    expect(addAuditLogMock).toHaveBeenCalled();
  });

  it("rejects incomplete input without opening a database transaction", async () => {
    const request = {
      json: async () => ({ serviceOrder: "OS-123" }),
    } as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(poolConnectMock).not.toHaveBeenCalled();
  });
});