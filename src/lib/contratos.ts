import type {
  ContractEntryInput,
  ContractInput,
  CreateContractInput,
} from "@/types/contratos";

export type ValidatedContractEntry = {
  paymentProcessNumber: string;
  monthlyPaidValue: string;
  glosasValue: string;
  referenceMonth: string;
  executionSummary: string;
  empenho: string;
};

export type ValidatedContract = {
  serviceOrder: string;
  totalValue: string;
};

const readRequiredText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const readAmount = (value: unknown) => {
  const raw = typeof value === "number" ? String(value) : readRequiredText(value);
  const normalized = raw.replace(",", ".");
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : null;
};

export function validateContractInput(body: unknown): {
  contract: ValidatedContract | null;
  error: string | null;
} {
  if (!body || typeof body !== "object") {
    return { contract: null, error: "Dados do contrato inválidos." };
  }

  const input = body as ContractInput;
  const serviceOrder = readRequiredText(input.serviceOrder);
  const totalValue = readAmount(input.totalValue);

  if (!serviceOrder || !totalValue) {
    return {
      contract: null,
      error: "Ordem de serviço e valor total válido são obrigatórios.",
    };
  }

  return { contract: { serviceOrder, totalValue }, error: null };
}

export function validateContractEntryInput(body: unknown): {
  entry: ValidatedContractEntry | null;
  error: string | null;
} {
  if (!body || typeof body !== "object") {
    return { entry: null, error: "Dados do lançamento mensal inválidos." };
  }

  const input = body as ContractEntryInput;
  const paymentProcessNumber = readRequiredText(input.paymentProcessNumber);
  const monthlyPaidValue = readAmount(input.monthlyPaidValue);
  const glosasValue = readAmount(input.glosasValue);
  const referenceMonth = readRequiredText(input.referenceMonth);
  const executionSummary = readRequiredText(input.executionSummary);
  const empenho = readRequiredText(input.empenho);

  if (
    !paymentProcessNumber ||
    !monthlyPaidValue ||
    !glosasValue ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(referenceMonth) ||
    !executionSummary ||
    !empenho
  ) {
    return {
      entry: null,
      error: "Todos os campos do lançamento mensal são obrigatórios e devem ser válidos.",
    };
  }

  return {
    entry: {
      paymentProcessNumber,
      monthlyPaidValue,
      glosasValue,
      referenceMonth: `${referenceMonth}-01`,
      executionSummary,
      empenho,
    },
    error: null,
  };
}

export function validateCreateContractInput(body: unknown): {
  contract: ValidatedContract | null;
  entry: ValidatedContractEntry | null;
  error: string | null;
} {
  if (!body || typeof body !== "object") {
    return { contract: null, entry: null, error: "Dados do contrato inválidos." };
  }

  const input = body as CreateContractInput;
  const contractResult = validateContractInput(input);
  if (!contractResult.contract) {
    return { contract: null, entry: null, error: contractResult.error };
  }

  const entryResult = validateContractEntryInput(input.initialEntry);
  if (!entryResult.entry) {
    return { contract: null, entry: null, error: entryResult.error };
  }

  return {
    contract: contractResult.contract,
    entry: entryResult.entry,
    error: null,
  };
}