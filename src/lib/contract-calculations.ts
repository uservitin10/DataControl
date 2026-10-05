export function isServiceOrderExpired(validTo: string | null, today: string) {
  return validTo !== null && validTo < today;
}

export function isContractClosed(
  serviceOrders: Array<{ validTo: string | null }>,
  today: string
) {
  return serviceOrders.length > 0 && serviceOrders.every((order) => isServiceOrderExpired(order.validTo, today));
}

export function getDecentralizedTotal(documents: Array<{ amount: string | number }>) {
  return documents.reduce((sum, document) => sum + Number(document.amount), 0);
}

export function getAvailableBalance(
  documents: Array<{ amount: string | number }>,
  entries: Array<{ monthlyPaidValue: string | number }>
) {
  const paidTotal = entries.reduce((sum, entry) => sum + Number(entry.monthlyPaidValue), 0);
  return getDecentralizedTotal(documents) - paidTotal;
}