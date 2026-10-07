import {
  getAvailableBalance,
  getDecentralizedTotal,
  getFinancialDocumentSignedAmount,
  isContractClosed,
  isServiceOrderExpired,
} from "./contract-calculations";
import { validateContractEntryInput, validateCreateContractInput } from "./contratos";

describe("contract payload validation", () => {
  const validEntry = {
    paymentProcessNumber: "00000.000001/2026-00",
    monthlyPaidValue: "1200.50",
    glosasValue: "0",
    referenceMonth: "2026-10",
    executionSummary: "Serviços executados conforme previsto.",
    empenho: "2026NE000001",
  };

  it("normalizes money and month values", () => {
    const result = validateCreateContractInput({
      name: "Keeggo",
      totalValue: "12000,5",
      executionSummary: "Serviços de QA.",
      initialServiceOrder: {
        siafNumber: "OS-123",
        seiDocumentNumber: "50465842",
        validFrom: "2025-05-12",
        validTo: "2025-12-31",
        serviceDescription: "Analista de QA.",
      },
      initialEntry: validEntry,
    });

    expect(result.error).toBeNull();
    expect(result.contract).toEqual({ name: "Keeggo", totalValue: "12000.50", executionSummary: "Serviços de QA." });
    expect(result.serviceOrder?.siafNumber).toBe("OS-123");
    expect(result.entry?.referenceMonth).toBe("2026-10-01");
    expect(result.entry?.glosasValue).toBe("0.00");
  });

  it("rejects missing monthly fields and invalid money", () => {
    expect(validateContractEntryInput({ ...validEntry, empenho: "" }).error).toContain("obrigatórios");
    expect(validateContractEntryInput({ ...validEntry, monthlyPaidValue: "-20" }).error).toContain("obrigatórios");
    expect(validateContractEntryInput({ ...validEntry, referenceMonth: "2026-13" }).error).toContain("obrigatórios");
  });
});

describe("contract closure", () => {
  const today = "2026-10-05";

  it("considers a contract open while any service order is current", () => {
    expect(isContractClosed([
      { validTo: "2026-10-04" },
      { validTo: "2026-12-31" },
    ], today)).toBe(false);
  });

  it("considers a contract closed when every service order has expired", () => {
    expect(isContractClosed([
      { validTo: "2026-10-04" },
      { validTo: "2025-12-31" },
    ], today)).toBe(true);
  });

  it("keeps contracts without service orders open", () => {
    expect(isContractClosed([], today)).toBe(false);
  });

  it("does not expire a service order on its final valid day", () => {
    expect(isServiceOrderExpired(today, today)).toBe(false);
  });
});

describe("contract financial balance", () => {
  it("includes every decentralized document, including credit notes", () => {
    expect(getDecentralizedTotal([
      { documentType: "Nota de Empenho", amount: "58005.00" },
      { documentType: "Nota de Empenho", amount: "58005.00" },
      { documentType: "Registro de Reforço", amount: "2575.44" },
      { documentType: "Nota de Crédito", amount: "60580.44" },
    ])).toBe(179165.88);
  });

  it("shows the remaining balance from the annual financial control example", () => {
    expect(getAvailableBalance(
      [
        { documentType: "Nota de Empenho", amount: "58005.00" },
        { documentType: "Nota de Empenho", amount: "58005.00" },
        { documentType: "Registro de Reforço", amount: "2575.44" },
        { documentType: "Nota de Crédito", amount: "60580.44" },
      ],
      [
        { monthlyPaidValue: "14501.25" },
        { monthlyPaidValue: "14501.25" },
        { monthlyPaidValue: "14501.25" },
        { monthlyPaidValue: "14501.25" },
        { monthlyPaidValue: "15145.11" },
        { monthlyPaidValue: "15145.11" },
        { monthlyPaidValue: "15145.11" },
      ]
    )).toBeCloseTo(75725.55, 2);
  });

  it("subtracts partial annulments and preserves negative balances from the spreadsheet", () => {
    const documents2025 = [
      { documentType: "Nota de Empenho", amount: "259570.08" },
    ];
    const documents2026 = [
      { documentType: "Nota de Empenho", amount: "151787.00" },
      { documentType: "Nota de Empenho", amount: "151787.64" },
      { documentType: "Registro de Reforço", amount: "125634.61" },
      { documentType: "Registro Anulação Parcial", amount: "118895.15" },
    ];

    expect(getAvailableBalance(documents2025, [{ monthlyPaidValue: "259570.16" }])).toBeCloseTo(-0.08, 2);
    expect(getFinancialDocumentSignedAmount(documents2026[3])).toBe(-118895.15);
    expect(getDecentralizedTotal(documents2026)).toBeCloseTo(310314.10, 2);
    expect(getAvailableBalance(documents2026, [{ monthlyPaidValue: "270682.89" }])).toBeCloseTo(39631.21, 2);
    expect(getAvailableBalance(
      [...documents2025, ...documents2026],
      [{ monthlyPaidValue: "259570.16" }, { monthlyPaidValue: "270682.89" }]
    )).toBeCloseTo(39631.13, 2);
  });
});