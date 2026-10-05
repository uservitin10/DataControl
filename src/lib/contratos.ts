import pool from "@/lib/db";
import type {
  ContractEntryInput,
  ContractInput,
  ContractRecord,
  ContractServiceOrderInput,
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
  name: string;
  totalValue: string;
  executionSummary: string;
};

export type ValidatedContractServiceOrder = {
  serviceOrderNumber: string;
  internalNumber: string;
  validFrom: string;
  validTo: string;
  serviceDescription: string;
  addendumNumber: string | null;
  addendumValidFrom: string | null;
  addendumValidTo: string | null;
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

const readDate = (value: unknown) => {
  const raw = readRequiredText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw ? null : raw;
};

export function validateContractInput(body: unknown): {
  contract: ValidatedContract | null;
  error: string | null;
} {
  if (!body || typeof body !== "object") {
    return { contract: null, error: "Dados do contrato inválidos." };
  }

  const input = body as ContractInput;
  const name = readRequiredText(input.name);
  const totalValue = readAmount(input.totalValue);
  const executionSummary = readRequiredText(input.executionSummary);

  if (!name || !totalValue || !executionSummary) {
    return {
      contract: null,
      error: "Nome, valor total válido e resumo da execução são obrigatórios.",
    };
  }

  return { contract: { name, totalValue, executionSummary }, error: null };
}

export function validateContractServiceOrderInput(body: unknown): {
  serviceOrder: ValidatedContractServiceOrder | null;
  error: string | null;
} {
  if (!body || typeof body !== "object") {
    return { serviceOrder: null, error: "Dados da ordem de serviço inválidos." };
  }

  const input = body as ContractServiceOrderInput;
  const serviceOrderNumber = readRequiredText(input.serviceOrderNumber);
  const internalNumber = readRequiredText(input.internalNumber);
  const validFrom = readDate(input.validFrom);
  const validTo = readDate(input.validTo);
  const serviceDescription = readRequiredText(input.serviceDescription);
  const addendumNumber = readRequiredText(input.addendumNumber);
  const rawAddendumFrom = readRequiredText(input.addendumValidFrom);
  const rawAddendumTo = readRequiredText(input.addendumValidTo);
  const addendumValidFrom = rawAddendumFrom ? readDate(rawAddendumFrom) : null;
  const addendumValidTo = rawAddendumTo ? readDate(rawAddendumTo) : null;

  if (
    !serviceOrderNumber ||
    !internalNumber ||
    !validFrom ||
    !validTo ||
    validFrom > validTo ||
    !serviceDescription ||
    (addendumNumber && (!addendumValidFrom || !addendumValidTo)) ||
    (!addendumNumber && (rawAddendumFrom || rawAddendumTo)) ||
    (addendumValidFrom && addendumValidTo && addendumValidFrom > addendumValidTo)
  ) {
    return {
      serviceOrder: null,
      error: "Preencha os campos obrigatórios da ordem de serviço e confira as vigências.",
    };
  }

  return {
    serviceOrder: {
      serviceOrderNumber,
      internalNumber,
      validFrom,
      validTo,
      serviceDescription,
      addendumNumber: addendumNumber || null,
      addendumValidFrom,
      addendumValidTo,
    },
    error: null,
  };
}

export function validateCreateContractInput(body: unknown): {
  contract: ValidatedContract | null;
  serviceOrder: ValidatedContractServiceOrder | null;
  entry: ValidatedContractEntry | null;
  error: string | null;
} {
  if (!body || typeof body !== "object") {
    return { contract: null, serviceOrder: null, entry: null, error: "Dados do contrato inválidos." };
  }

  const input = body as CreateContractInput;
  const contractResult = validateContractInput(input);
  if (!contractResult.contract) {
    return { contract: null, serviceOrder: null, entry: null, error: contractResult.error };
  }

  const orderResult = validateContractServiceOrderInput(input.initialServiceOrder);
  if (!orderResult.serviceOrder) {
    return { contract: null, serviceOrder: null, entry: null, error: orderResult.error };
  }

  const entryResult = validateContractEntryInput(input.initialEntry);
  if (!entryResult.entry) {
    return { contract: null, serviceOrder: null, entry: null, error: entryResult.error };
  }

  return {
    contract: contractResult.contract,
    serviceOrder: orderResult.serviceOrder,
    entry: entryResult.entry,
    error: null,
  };
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

export async function getContractsWithDetails(contractId?: string): Promise<ContractRecord[]> {
  const contractResult = await pool.query(
    `SELECT id, name, total_value::text AS "totalValue",
       execution_summary AS "executionSummary", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM public.contracts
     ${contractId ? "WHERE id = $1" : ""}
     ORDER BY name ASC`,
    contractId ? [contractId] : []
  );
  const contracts = contractResult.rows;
  if (!contracts.length) return [];

  const contractIds = contracts.map((contract) => contract.id as string);
  const orderResult = await pool.query(
    `SELECT id, contract_id AS "contractId", service_order_number AS "serviceOrderNumber",
       internal_number AS "internalNumber", to_char(valid_from, 'YYYY-MM-DD') AS "validFrom",
       to_char(valid_to, 'YYYY-MM-DD') AS "validTo", service_description AS "serviceDescription",
       addendum_number AS "addendumNumber",
       to_char(addendum_valid_from, 'YYYY-MM-DD') AS "addendumValidFrom",
       to_char(addendum_valid_to, 'YYYY-MM-DD') AS "addendumValidTo"
     FROM public.contract_service_orders
     WHERE contract_id = ANY($1::uuid[])
     ORDER BY valid_from ASC, service_order_number ASC`,
    [contractIds]
  );
  const orders = orderResult.rows;
  const orderIds = orders.map((order) => order.id as string);

  const entryResult = orderIds.length
    ? await pool.query(
        `SELECT id, service_order_id AS "serviceOrderId",
           payment_process_number AS "paymentProcessNumber",
           monthly_paid_value::text AS "monthlyPaidValue",
           monthly_net_value::text AS "monthlyNetValue",
           glosas_value::text AS "glosasValue",
           to_char(reference_month, 'YYYY-MM') AS "referenceMonth",
           execution_summary AS "executionSummary", empenho,
           created_at AS "createdAt", updated_at AS "updatedAt"
         FROM public.contract_monthly_entries
         WHERE service_order_id = ANY($1::uuid[])
         ORDER BY reference_month DESC`,
        [orderIds]
      )
    : { rows: [] };

  const financialResult = await pool.query(
    `SELECT id, contract_id AS "contractId", fiscal_year AS "fiscalYear",
       document_type AS "documentType", document_number AS "documentNumber",
       sei_reference AS "seiReference", amount::text AS amount,
       coverage_description AS "coverageDescription"
     FROM public.contract_financial_documents
     WHERE contract_id = ANY($1::uuid[])
     ORDER BY fiscal_year DESC, document_number ASC`,
    [contractIds]
  );

  const entriesByOrder = new Map<string, ContractRecord["serviceOrders"][number]["monthlyEntries"]>();
  for (const entry of entryResult.rows) {
    const orderId = entry.serviceOrderId as string;
    const entries = entriesByOrder.get(orderId) ?? [];
    entries.push(entry);
    entriesByOrder.set(orderId, entries);
  }

  const ordersByContract = new Map<string, ContractRecord["serviceOrders"]>();
  for (const order of orders) {
    const contractKey = order.contractId as string;
    const contractOrders = ordersByContract.get(contractKey) ?? [];
    contractOrders.push({
      id: order.id,
      serviceOrderNumber: order.serviceOrderNumber,
      internalNumber: order.internalNumber,
      validFrom: order.validFrom,
      validTo: order.validTo,
      serviceDescription: order.serviceDescription,
      addendumNumber: order.addendumNumber,
      addendumValidFrom: order.addendumValidFrom,
      addendumValidTo: order.addendumValidTo,
      monthlyEntries: entriesByOrder.get(order.id as string) ?? [],
    });
    ordersByContract.set(contractKey, contractOrders);
  }

  const documentsByContract = new Map<string, ContractRecord["financialDocuments"]>();
  for (const document of financialResult.rows) {
    const contractKey = document.contractId as string;
    const documents = documentsByContract.get(contractKey) ?? [];
    documents.push({
      id: document.id,
      fiscalYear: Number(document.fiscalYear),
      documentType: document.documentType,
      documentNumber: document.documentNumber,
      seiReference: document.seiReference,
      amount: document.amount,
      coverageDescription: document.coverageDescription,
    });
    documentsByContract.set(contractKey, documents);
  }

  return contracts.map((contract) => ({
    id: contract.id,
    name: contract.name,
    totalValue: contract.totalValue,
    executionSummary: contract.executionSummary,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
    serviceOrders: ordersByContract.get(contract.id) ?? [],
    financialDocuments: documentsByContract.get(contract.id) ?? [],
  }));
}
