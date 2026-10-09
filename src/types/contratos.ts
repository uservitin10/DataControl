export type ContractMonthlyEntry = {
  id: string;
  paymentProcessNumber: string;
  monthlyPaidValue: string;
  monthlyNetValue: string;
  glosasValue: string;
  referenceMonth: string;
  executionSummary: string;
  empenho: string;
  createdAt: string;
  updatedAt: string;
};

export type ContractAnnualEntry = {
  id: string;
  paymentProcessNumber: string;
  annualPaidValue: string;
  annualNetValue: string;
  glosasValue: string;
  fiscalYear: number;
  executionSummary: string;
  createdAt: string;
  updatedAt: string;
};

export type ContractPaymentFrequency = "monthly" | "annual";

export type ContractServiceOrder = {
  id: string;
  siafNumber: string;
  seiDocumentNumber: string;
  validFrom: string | null;
  validTo: string | null;
  serviceDescription: string;
  monthlyEntries: ContractMonthlyEntry[];
  annualEntries: ContractAnnualEntry[];
};

export type ContractFinancialDocument = {
  id: string;
  fiscalYear: number;
  documentType: string;
  documentNumber: string;
  seiReference: string;
  amount: string;
  coverageDescription: string;
};

export type ContractRecord = {
  id: string;
  name: string;
  totalValue: string;
  executionSummary: string;
  paymentFrequency: ContractPaymentFrequency;
  validFrom: string | null;
  validTo: string | null;
  createdAt: string;
  updatedAt: string;
  isClosed: boolean;
  serviceOrders: ContractServiceOrder[];
  financialDocuments: ContractFinancialDocument[];
};

export type ContractEntryInput = {
  paymentProcessNumber: string;
  monthlyPaidValue: string | number;
  glosasValue: string | number;
  referenceMonth: string;
  executionSummary: string;
  empenho: string;
};

export type ContractAnnualEntryInput = {
  paymentProcessNumber: string;
  annualPaidValue: string | number;
  glosasValue: string | number;
  fiscalYear: number | string;
  executionSummary: string;
};

export type ContractInput = {
  name: string;
  totalValue: string | number;
  executionSummary: string;
  paymentFrequency: ContractPaymentFrequency;
  validFrom?: string | null;
  validTo?: string | null;
};

export type ContractServiceOrderInput = {
  siafNumber: string;
  seiDocumentNumber: string;
  validFrom: string | null;
  validTo: string | null;
  serviceDescription: string;
};

export type CreateContractInput = ContractInput & {
  initialServiceOrder: ContractServiceOrderInput;
  initialEntry?: ContractEntryInput;
};