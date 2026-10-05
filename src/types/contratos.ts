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

export type ContractServiceOrder = {
  id: string;
  serviceOrderNumber: string;
  internalNumber: string;
  validFrom: string | null;
  validTo: string | null;
  serviceDescription: string;
  addendumNumber: string | null;
  addendumValidFrom: string | null;
  addendumValidTo: string | null;
  monthlyEntries: ContractMonthlyEntry[];
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
  createdAt: string;
  updatedAt: string;
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

export type ContractInput = {
  name: string;
  totalValue: string | number;
  executionSummary: string;
};

export type ContractServiceOrderInput = {
  serviceOrderNumber: string;
  internalNumber: string;
  validFrom: string;
  validTo: string;
  serviceDescription: string;
  addendumNumber?: string;
  addendumValidFrom?: string;
  addendumValidTo?: string;
};

export type CreateContractInput = ContractInput & {
  initialServiceOrder: ContractServiceOrderInput;
  initialEntry: ContractEntryInput;
};