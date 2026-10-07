import pool from "@/lib/db";
import type {
  ContractEntryInput,
  ContractAnnualEntryInput,
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

export type ValidatedContractAnnualEntry = {
  paymentProcessNumber: string;
  annualPaidValue: string;
  glosasValue: string;
  fiscalYear: number;
  executionSummary: string;
};

export type ValidatedContract = {
  name: string;
  totalValue: string;
  executionSummary: string;
  paymentFrequency: "monthly" | "annual";
  validFrom: string | null;
  validTo: string | null;
};

export type ValidatedContractServiceOrder = {
  siafNumber: string;
  seiDocumentNumber: string;
  validFrom: string | null;
  validTo: string | null;
  serviceDescription: string;
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

const readOptionalDate = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return { date: null, valid: true };
  }
  const date = readDate(value);
  return { date, valid: date !== null };
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
  const paymentFrequency = name.toLocaleLowerCase("pt-BR") === "gartner" ? "annual" : "monthly";
  const requestedFrequency = input.paymentFrequency ?? paymentFrequency;
  const validFrom = readOptionalDate(input.validFrom);
  const validTo = readOptionalDate(input.validTo);

  if (
    !name ||
    !totalValue ||
    !executionSummary ||
    requestedFrequency !== paymentFrequency ||
    !validFrom.valid ||
    !validTo.valid ||
    (validFrom.date && validTo.date && validFrom.date > validTo.date)
  ) {
    return {
      contract: null,
      error: "Informe nome, valor, resumo, periodicidade e datas de vigência válidas.",
    };
  }

  return {
    contract: {
      name,
      totalValue,
      executionSummary,
      paymentFrequency,
      validFrom: validFrom.date,
      validTo: validTo.date,
    },
    error: null,
  };
}

export function validateContractServiceOrderInput(body: unknown): {
  serviceOrder: ValidatedContractServiceOrder | null;
  error: string | null;
} {
  if (!body || typeof body !== "object") {
    return { serviceOrder: null, error: "Dados da ordem de serviço inválidos." };
  }

  const input = body as ContractServiceOrderInput;
  const siafNumber = readRequiredText(input.siafNumber);
  const seiDocumentNumber = readRequiredText(input.seiDocumentNumber);
  const validFrom = readOptionalDate(input.validFrom);
  const validTo = readOptionalDate(input.validTo);
  const serviceDescription = readRequiredText(input.serviceDescription);

  if (
    !siafNumber ||
    !seiDocumentNumber ||
    !validFrom.valid ||
    !validTo.valid ||
    (validFrom.date && validTo.date && validFrom.date > validTo.date) ||
    !serviceDescription
  ) {
    return {
      serviceOrder: null,
      error: "Preencha os campos obrigatórios da ordem de serviço e confira a vigência.",
    };
  }

  return {
    serviceOrder: {
      siafNumber,
      seiDocumentNumber,
      validFrom: validFrom.date,
      validTo: validTo.date,
      serviceDescription,
    },
    error: null,
  };
}

export async function getContractClosureStatus(contractId: string) {
  const result = await pool.query(
    `SELECT CASE
       WHEN c.valid_to IS NOT NULL THEN c.valid_to < CURRENT_DATE
       ELSE COALESCE((
         SELECT BOOL_AND(valid_to IS NOT NULL AND valid_to < CURRENT_DATE) AND COUNT(*) > 0
         FROM public.contract_service_orders
         WHERE contract_id = c.id
       ), false)
     END AS "isClosed"
     FROM public.contracts c
     WHERE c.id = $1`,
    [contractId]
  );
  return result.rows[0]?.isClosed === true;
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

  if (contractResult.contract.paymentFrequency === "annual" && input.initialEntry) {
    return {
      contract: null,
      serviceOrder: null,
      entry: null,
      error: "Contratos com baixa anual não aceitam lançamento mensal inicial.",
    };
  }

  if (contractResult.contract.paymentFrequency === "annual") {
    return {
      contract: contractResult.contract,
      serviceOrder: orderResult.serviceOrder,
      entry: null,
      error: null,
    };
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

export function validateContractAnnualEntryInput(body: unknown): {
  annualEntry: ValidatedContractAnnualEntry | null;
  error: string | null;
} {
  if (!body || typeof body !== "object") {
    return { annualEntry: null, error: "Dados da baixa anual inválidos." };
  }

  const input = body as ContractAnnualEntryInput;
  const paymentProcessNumber = readRequiredText(input.paymentProcessNumber);
  const annualPaidValue = readAmount(input.annualPaidValue);
  const glosasValue = readAmount(input.glosasValue);
  const fiscalYearText = String(input.fiscalYear ?? "").trim();
  const fiscalYear = Number(fiscalYearText);
  const executionSummary = readRequiredText(input.executionSummary);

  if (
    !paymentProcessNumber ||
    !annualPaidValue ||
    !glosasValue ||
    !/^\d{4}$/.test(fiscalYearText) ||
    fiscalYear < 1900 ||
    fiscalYear > 9999 ||
    !executionSummary
  ) {
    return {
      annualEntry: null,
      error: "Informe processo, exercício, valores válidos e resumo da execução.",
    };
  }

  return {
    annualEntry: { paymentProcessNumber, annualPaidValue, glosasValue, fiscalYear, executionSummary },
    error: null,
  };
}

export async function getContractsWithDetails(contractId?: string): Promise<ContractRecord[]> {
  const contractResult = await pool.query(
     `SELECT c.id, c.name, c.total_value::text AS "totalValue",
       c.execution_summary AS "executionSummary", c.payment_frequency AS "paymentFrequency",
       to_char(c.valid_from, 'YYYY-MM-DD') AS "validFrom",
       to_char(c.valid_to, 'YYYY-MM-DD') AS "validTo",
       c.created_at AS "createdAt", c.updated_at AS "updatedAt",
       CASE
         WHEN c.valid_to IS NOT NULL THEN c.valid_to < CURRENT_DATE
         ELSE COALESCE((
           SELECT BOOL_AND(so.valid_to IS NOT NULL AND so.valid_to < CURRENT_DATE) AND COUNT(*) > 0
           FROM public.contract_service_orders so
           WHERE so.contract_id = c.id
         ), false)
       END AS "isClosed"
      FROM public.contracts c
      ${contractId ? "WHERE c.id = $1" : ""}
      ORDER BY c.name ASC`,
    contractId ? [contractId] : []
  );
  const contracts = contractResult.rows;
  if (!contracts.length) return [];

  const contractIds = contracts.map((contract) => contract.id as string);
  const orderResult = await pool.query(
    `SELECT id, contract_id AS "contractId", siaf_number AS "siafNumber",
       sei_document_number AS "seiDocumentNumber", to_char(valid_from, 'YYYY-MM-DD') AS "validFrom",
       to_char(valid_to, 'YYYY-MM-DD') AS "validTo", service_description AS "serviceDescription"
     FROM public.contract_service_orders
     WHERE contract_id = ANY($1::uuid[])
    ORDER BY valid_from ASC, siaf_number ASC`,
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

  const annualEntryResult = orderIds.length
    ? await pool.query(
        `SELECT id, service_order_id AS "serviceOrderId",
           payment_process_number AS "paymentProcessNumber",
           annual_paid_value::text AS "annualPaidValue",
           annual_net_value::text AS "annualNetValue",
           glosas_value::text AS "glosasValue",
           fiscal_year AS "fiscalYear",
           execution_summary AS "executionSummary",
           created_at AS "createdAt", updated_at AS "updatedAt"
         FROM public.contract_annual_entries
         WHERE service_order_id = ANY($1::uuid[])
         ORDER BY fiscal_year DESC`,
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

  const annualEntriesByOrder = new Map<string, ContractRecord["serviceOrders"][number]["annualEntries"]>();
  for (const entry of annualEntryResult.rows) {
    const orderId = entry.serviceOrderId as string;
    const entries = annualEntriesByOrder.get(orderId) ?? [];
    entries.push({ ...entry, fiscalYear: Number(entry.fiscalYear) });
    annualEntriesByOrder.set(orderId, entries);
  }

  const ordersByContract = new Map<string, ContractRecord["serviceOrders"]>();
  for (const order of orders) {
    const contractKey = order.contractId as string;
    const contractOrders = ordersByContract.get(contractKey) ?? [];
    contractOrders.push({
      id: order.id,
      siafNumber: order.siafNumber,
      seiDocumentNumber: order.seiDocumentNumber,
      validFrom: order.validFrom,
      validTo: order.validTo,
      serviceDescription: order.serviceDescription,
      monthlyEntries: entriesByOrder.get(order.id as string) ?? [],
      annualEntries: annualEntriesByOrder.get(order.id as string) ?? [],
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
    paymentFrequency: contract.paymentFrequency,
    validFrom: contract.validFrom,
    validTo: contract.validTo,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
    isClosed: contract.isClosed === true,
    serviceOrders: ordersByContract.get(contract.id) ?? [],
    financialDocuments: documentsByContract.get(contract.id) ?? [],
  }));
}
