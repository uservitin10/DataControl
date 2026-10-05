import {
  validateContractEntryInput,
  validateCreateContractInput,
} from "./contratos";

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
        serviceOrderNumber: "OS-123",
        internalNumber: "50465842",
        validFrom: "2025-05-12",
        validTo: "2025-12-31",
        serviceDescription: "Analista de QA.",
      },
      initialEntry: validEntry,
    });

    expect(result.error).toBeNull();
    expect(result.contract).toEqual({ name: "Keeggo", totalValue: "12000.50", executionSummary: "Serviços de QA." });
    expect(result.serviceOrder?.serviceOrderNumber).toBe("OS-123");
    expect(result.entry?.referenceMonth).toBe("2026-10-01");
    expect(result.entry?.glosasValue).toBe("0.00");
  });

  it("rejects missing monthly fields and invalid money", () => {
    expect(validateContractEntryInput({ ...validEntry, empenho: "" }).error).toContain("obrigatórios");
    expect(validateContractEntryInput({ ...validEntry, monthlyPaidValue: "-20" }).error).toContain("obrigatórios");
    expect(validateContractEntryInput({ ...validEntry, referenceMonth: "2026-13" }).error).toContain("obrigatórios");
  });
});