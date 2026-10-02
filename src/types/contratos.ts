export type ContractMonthlyEntry = {
  id: string;
  paymentProcessNumber: string;
  monthlyPaidValue: string;
  glosasValue: string;
  referenceMonth: string;
  executionSummary: string;
  empenho: string;
  createdAt: string;
  updatedAt: string;
};

export type ContractRecord = {
  id: string;
  serviceOrder: string;
  totalValue: string;
  createdAt: string;
  updatedAt: string;
  entries: ContractMonthlyEntry[];
};

export type ContractEntryInput = {
  paymentProcessNumber: string;
  monthlyPaidValue: string | number;
  glosasValue: string | number;
  referenceMonth: string;
  executionSummary: string;
  empenho: string;
};

export type CreateContractInput = {
  serviceOrder: string;
  totalValue: string | number;
  initialEntry: ContractEntryInput;
};

export type ContractInput = {
  serviceOrder: string;
  totalValue: string | number;
};