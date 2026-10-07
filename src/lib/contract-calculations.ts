export function isServiceOrderExpired(validTo: string | null, today: string) {
  return validTo !== null && validTo < today;
}

export function isContractClosed(
  serviceOrders: Array<{ validTo: string | null }>,
  today: string
) {
  return serviceOrders.length > 0 && serviceOrders.every((order) => isServiceOrderExpired(order.validTo, today));
}

export function getDecentralizedTotal(documents: Array<{ documentType: string; amount: string | number }>) {
  return documents.reduce((sum, document) => {
    const normalizedType = document.documentType
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
    const direction = normalizedType.includes("anulacao") ? -1 : 1;
    return sum + direction * Number(document.amount);
  }, 0);
}

export function getAvailableBalance(
  documents: Array<{ documentType: string; amount: string | number }>,
  entries: Array<{ monthlyPaidValue: string | number }>
) {
  const paidTotal = entries.reduce((sum, entry) => sum + Number(entry.monthlyPaidValue), 0);
  return getDecentralizedTotal(documents) - paidTotal;
}