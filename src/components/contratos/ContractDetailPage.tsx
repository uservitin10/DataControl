"use client";

import { type Dispatch, type FormEvent, type ReactNode, type SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Logo } from "@/components/Logo";
import PageHeader from "@/components/PageHeader";
import UserBadge from "@/components/UserBadge";
import { fetchJson, patchJson, postJson } from "@/lib/api";
import { getDecentralizedTotal, getFinancialDocumentSignedAmount } from "@/lib/contract-calculations";
import type { ContractAnnualEntry, ContractMonthlyEntry, ContractRecord, ContractServiceOrder } from "@/types/contratos";

type OrderForm = {
  siafNumber: string;
  seiDocumentNumber: string;
  validFrom: string;
  validTo: string;
  serviceDescription: string;
};

type EntryForm = {
  paymentProcessNumber: string;
  monthlyPaidValue: string;
  glosasValue: string;
  referenceMonth: string;
  executionSummary: string;
  empenho: string;
};

type AnnualEntryForm = {
  paymentProcessNumber: string;
  annualPaidValue: string;
  glosasValue: string;
  fiscalYear: string;
  executionSummary: string;
};

type DetailModal =
  | { type: "order"; order: ContractServiceOrder | null }
  | { type: "entry"; order: ContractServiceOrder; entry: ContractMonthlyEntry | null }
  | { type: "annualEntry"; order: ContractServiceOrder; entry: ContractAnnualEntry | null }
  | null;

const emptyOrder = (): OrderForm => ({
  siafNumber: "",
  seiDocumentNumber: "",
  validFrom: "",
  validTo: "",
  serviceDescription: "",
});

const emptyEntry = (): EntryForm => {
  const now = new Date();
  return {
    paymentProcessNumber: "",
    monthlyPaidValue: "",
    glosasValue: "0.00",
    referenceMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    executionSummary: "",
    empenho: "",
  };
};

const emptyAnnualEntry = (): AnnualEntryForm => ({
  paymentProcessNumber: "",
  annualPaidValue: "",
  glosasValue: "0.00",
  fiscalYear: String(new Date().getFullYear()),
  executionSummary: "",
});

const formatCurrency = (value: string | number) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

const formatMonth = (value: string) => {
  const [year, month] = value.slice(0, 7).split("-");
  return `${month}/${year}`;
};

export function ContractDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const contractId = params.id;
  const { data: session, status } = useSession();
  const [contract, setContract] = useState<ContractRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<DetailModal>(null);
  const [orderForm, setOrderForm] = useState<OrderForm>(emptyOrder);
  const [entryForm, setEntryForm] = useState<EntryForm>(emptyEntry);
  const [annualEntryForm, setAnnualEntryForm] = useState<AnnualEntryForm>(emptyAnnualEntry);
  const [collapsedOrderIds, setCollapsedOrderIds] = useState<Set<string>>(() => new Set());
  const canManage = ["admin", "editor"].includes(session?.user?.role ?? "");
  const isAdmin = session?.user?.role === "admin";

  const loadContract = useCallback(async () => {
    const response = await fetchJson<{ data: ContractRecord }>(`/api/contratos/${encodeURIComponent(contractId)}`);
    setContract(response.data);
  }, [contractId]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.id) {
      router.replace("/login");
      return;
    }

    loadContract()
      .catch((loadError) => setError((loadError as Error).message || "Não foi possível carregar o contrato."))
      .finally(() => setLoading(false));
  }, [loadContract, router, session?.user?.id, status]);

  const allEntries = useMemo(
    () => contract?.serviceOrders.flatMap((order) => order.monthlyEntries) ?? [],
    [contract]
  );
  const allAnnualEntries = useMemo(
    () => contract?.serviceOrders.flatMap((order) => order.annualEntries) ?? [],
    [contract]
  );
  const paidTotal =
    allEntries.reduce((sum, entry) => sum + Number(entry.monthlyPaidValue), 0) +
    allAnnualEntries.reduce((sum, entry) => sum + Number(entry.annualPaidValue), 0);
  const netTotal =
    allEntries.reduce((sum, entry) => sum + Number(entry.monthlyNetValue), 0) +
    allAnnualEntries.reduce((sum, entry) => sum + Number(entry.annualNetValue), 0);
  const glosasTotal =
    allEntries.reduce((sum, entry) => sum + Number(entry.glosasValue), 0) +
    allAnnualEntries.reduce((sum, entry) => sum + Number(entry.glosasValue), 0);
  const decentralizedTotal = getDecentralizedTotal(contract?.financialDocuments ?? []);
  const yearlySummary = useMemo(() => {
    if (!contract) return [];
    const years = new Set<number>([
      ...contract.financialDocuments.map((document) => document.fiscalYear),
      ...allEntries.map((entry) => Number(entry.referenceMonth.slice(0, 4))),
      ...allAnnualEntries.map((entry) => entry.fiscalYear),
    ]);
    return [...years].sort((left, right) => right - left).map((year) => {
      const allocated = getDecentralizedTotal(
        contract.financialDocuments.filter((document) => document.fiscalYear === year)
      );
      const monthlyPaid = allEntries
        .filter((entry) => Number(entry.referenceMonth.slice(0, 4)) === year)
        .reduce((sum, entry) => sum + Number(entry.monthlyPaidValue), 0);
      const annualPaid = allAnnualEntries
        .filter((entry) => entry.fiscalYear === year)
        .reduce((sum, entry) => sum + Number(entry.annualPaidValue), 0);
      const paid = monthlyPaid + annualPaid;
      return { year, allocated, paid, balance: allocated - paid };
    });
  }, [allAnnualEntries, allEntries, contract]);

  const openCreateOrder = () => {
    setOrderForm(emptyOrder());
    setError("");
    setModal({ type: "order", order: null });
  };

  const openEditOrder = (order: ContractServiceOrder) => {
    setOrderForm({
      siafNumber: order.siafNumber,
      seiDocumentNumber: order.seiDocumentNumber,
      validFrom: order.validFrom ?? "",
      validTo: order.validTo ?? "",
      serviceDescription: order.serviceDescription,
    });
    setError("");
    setModal({ type: "order", order });
  };

  const openEntryForm = (order: ContractServiceOrder, entry: ContractMonthlyEntry | null = null) => {
    setEntryForm({
      paymentProcessNumber: entry?.paymentProcessNumber ?? "",
      monthlyPaidValue: entry?.monthlyPaidValue ?? "",
      glosasValue: entry?.glosasValue ?? "0.00",
      referenceMonth: entry?.referenceMonth.slice(0, 7) ?? emptyEntry().referenceMonth,
      executionSummary: entry?.executionSummary ?? order.serviceDescription,
      empenho: entry?.empenho ?? "",
    });
    setError("");
    setModal({ type: "entry", order, entry });
  };

  const openAnnualEntryForm = (order: ContractServiceOrder, entry: ContractAnnualEntry | null = null) => {
    setAnnualEntryForm({
      paymentProcessNumber: entry?.paymentProcessNumber ?? "",
      annualPaidValue: entry?.annualPaidValue ?? "",
      glosasValue: entry?.glosasValue ?? "0.00",
      fiscalYear: String(entry?.fiscalYear ?? new Date().getFullYear()),
      executionSummary: entry?.executionSummary ?? order.serviceDescription,
    });
    setError("");
    setModal({ type: "annualEntry", order, entry });
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);
    setError("");
    try {
      if (modal.type === "order") {
        const url = modal.order
          ? `/api/contratos/${encodeURIComponent(contractId)}/ordens-servico/${encodeURIComponent(modal.order.id)}`
          : `/api/contratos/${encodeURIComponent(contractId)}/ordens-servico`;
        const payload = orderForm;
        if (modal.order) await patchJson(url, payload);
        else await postJson(url, payload);
      } else if (modal.type === "annualEntry") {
        const baseUrl = `/api/contratos/${encodeURIComponent(contractId)}/ordens-servico/${encodeURIComponent(modal.order.id)}/baixas-anuais`;
        const payload = { ...annualEntryForm, fiscalYear: Number(annualEntryForm.fiscalYear) };
        if (modal.entry) {
          await patchJson(`${baseUrl}/${encodeURIComponent(modal.entry.id)}`, payload);
        } else {
          await postJson(baseUrl, payload);
        }
      } else {
        const baseUrl = `/api/contratos/${encodeURIComponent(contractId)}/ordens-servico/${encodeURIComponent(modal.order.id)}/lancamentos`;
        if (modal.entry) {
          await patchJson(`${baseUrl}/${encodeURIComponent(modal.entry.id)}`, entryForm);
        } else {
          await postJson(baseUrl, entryForm);
        }
      }
      await loadContract();
      setModal(null);
    } catch (saveError) {
      setError((saveError as Error).message || "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrder = async (order: ContractServiceOrder) => {
    if (!window.confirm(`Excluir a OS ${order.siafNumber} e seus lançamentos mensais?`)) return;
    setDeletingId(order.id);
    setError("");
    try {
      await fetchJson(`/api/contratos/${encodeURIComponent(contractId)}/ordens-servico/${encodeURIComponent(order.id)}`, { method: "DELETE" });
      await loadContract();
    } catch (deleteError) {
      setError((deleteError as Error).message || "Não foi possível excluir a OS.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteEntry = async (order: ContractServiceOrder, entry: ContractMonthlyEntry) => {
    if (!window.confirm(`Excluir o pagamento de ${formatMonth(entry.referenceMonth)} da OS ${order.siafNumber}?`)) return;
    setDeletingId(entry.id);
    setError("");
    try {
      await fetchJson(
        `/api/contratos/${encodeURIComponent(contractId)}/ordens-servico/${encodeURIComponent(order.id)}/lancamentos/${encodeURIComponent(entry.id)}`,
        { method: "DELETE" }
      );
      await loadContract();
    } catch (deleteError) {
      setError((deleteError as Error).message || "Não foi possível excluir o lançamento.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAnnualEntry = async (order: ContractServiceOrder, entry: ContractAnnualEntry) => {
    if (!window.confirm(`Excluir a baixa de ${entry.fiscalYear} da OS ${order.siafNumber}?`)) return;
    setDeletingId(entry.id);
    setError("");
    try {
      await fetchJson(
        `/api/contratos/${encodeURIComponent(contractId)}/ordens-servico/${encodeURIComponent(order.id)}/baixas-anuais/${encodeURIComponent(entry.id)}`,
        { method: "DELETE" }
      );
      await loadContract();
    } catch (deleteError) {
      setError((deleteError as Error).message || "Não foi possível excluir a baixa anual.");
    } finally {
      setDeletingId(null);
    }
  };

  if (status === "loading" || loading) {
    return <main className="gov-page-bg flex min-h-screen items-center justify-center"><p className="text-gov-muted">Carregando contrato...</p></main>;
  }

  if (!contract) {
    return <main className="gov-page-bg min-h-screen p-8"><PageHeader title="Contrato não encontrado" backHref="/contratos" />{error && <p role="alert" className="text-red-700">{error}</p>}</main>;
  }

  const canAddInformation = canManage && (!contract.isClosed || isAdmin);

  return (
    <main className="gov-page-bg min-h-screen">
      <nav className="gov-header px-6 py-4 shadow-soft">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-4 rounded-lg px-3 py-2 text-left transition hover:bg-white/10" aria-label="Ir para o Dashboard">
            <Logo className="h-10 w-auto" width={40} height={40} alt="Horús" />
            <div><h1 className="text-lg font-semibold text-white">Horús</h1><p className="text-xs text-white/80">Portal de Gestão de Documentos</p></div>
          </Link>
          <UserBadge />
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        <PageHeader
          title={contract.name}
          subtitle={contract.executionSummary}
          backHref="/contratos"
          actions={canAddInformation ? <button type="button" onClick={openCreateOrder} className="gov-button rounded-lg px-4 py-2 text-sm font-semibold">+ Nova OS</button> : null}
        />

        {contract.isClosed && <div aria-live="polite" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Contrato encerrado. {isAdmin ? "Administradores podem adicionar OS e lançamentos para completar o cadastro." : "Somente administradores podem adicionar novas informações."}</div>}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Resumo financeiro do contrato">
          <Summary label="Valor total do contrato" value={formatCurrency(contract.totalValue)} />
          <Summary label="Vigência do contrato" value={`${formatDate(contract.validFrom)} a ${formatDate(contract.validTo)}`} />
          <Summary label="Total descentralizado" value={formatCurrency(decentralizedTotal)} />
          <Summary label="Total pago" value={formatCurrency(paidTotal)} />
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">Saldos por ano</p>
            <div className="mt-2 space-y-1">{yearlySummary.map(({ year, balance }) => <p key={year} className="text-sm font-semibold text-slate-900">Saldo ano {year}: {formatCurrency(balance)}</p>)}</div>
          </div>
          <Summary label="Total líquido após glosas" value={formatCurrency(netTotal)} />
          <Summary label="Glosas acumuladas" value={formatCurrency(glosasTotal)} />
        </section>

        <section className="mb-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Execução contratual</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Ordens de serviço</h2></div>
            <p className="text-sm text-slate-500">{contract.serviceOrders.length} OS</p>
          </div>
          <div className="space-y-6">
            {contract.serviceOrders.map((order) => {
              const orderPaid =
                order.monthlyEntries.reduce((sum, entry) => sum + Number(entry.monthlyPaidValue), 0) +
                order.annualEntries.reduce((sum, entry) => sum + Number(entry.annualPaidValue), 0);
              const orderGlosas =
                order.monthlyEntries.reduce((sum, entry) => sum + Number(entry.glosasValue), 0) +
                order.annualEntries.reduce((sum, entry) => sum + Number(entry.glosasValue), 0);
              const isOrderCollapsed = collapsedOrderIds.has(order.id);
              return <article key={order.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 p-5">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">OS {order.siafNumber}</h3>
                    <p className="mt-1 text-sm text-slate-600">Documento SEI: {order.seiDocumentNumber}</p>
                  </div>
                  {canManage && <div className="flex gap-2">
                    {canAddInformation && (contract.paymentFrequency === "annual"
                      ? <button type="button" onClick={() => openAnnualEntryForm(order)} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">+ Baixa anual</button>
                      : <button type="button" onClick={() => openEntryForm(order)} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">+ Pagamento mensal</button>)}
                    <button type="button" onClick={() => openEditOrder(order)} className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100">Editar OS</button>
                    <button type="button" onClick={() => void handleDeleteOrder(order)} disabled={deletingId === order.id} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50">Excluir OS</button>
                  </div>}
                  <button
                    type="button"
                    aria-expanded={!isOrderCollapsed}
                    aria-controls={`order-details-${order.id}`}
                    onClick={() => setCollapsedOrderIds((current) => {
                      const next = new Set(current);
                      if (next.has(order.id)) next.delete(order.id);
                      else next.add(order.id);
                      return next;
                    })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
                  >
                    {isOrderCollapsed ? "Expandir OS" : "Minimizar OS"}
                  </button>
                </header>

                {!isOrderCollapsed && <div id={`order-details-${order.id}`}>
                  <div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-2 xl:grid-cols-4">
                    <Info label="Vigência" value={contract.paymentFrequency === "annual"
                      ? `${formatDate(contract.validFrom)} a ${formatDate(contract.validTo)}`
                      : `${formatDate(order.validFrom)} a ${formatDate(order.validTo)}`} />
                    <Info label="Total pago / glosas" value={`${formatCurrency(orderPaid)} / ${formatCurrency(orderGlosas)}`} />
                    <Info label="Resumo da execução" value={order.serviceDescription} wide />
                  </div>

                  {contract.paymentFrequency === "annual" ? <div className="p-5">
                    <h4 className="mb-3 text-sm font-semibold text-slate-800">Baixas anuais</h4>
                    {order.annualEntries.length ? <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-slate-50 uppercase text-slate-500"><tr>
                          <th className="px-4 py-3">Exercício</th><th className="px-4 py-3">Processo de pagamento (SEI)</th><th className="px-4 py-3">Valor pago</th><th className="px-4 py-3">Glosas</th><th className="px-4 py-3">Valor líquido</th><th className="px-4 py-3">Resumo da execução</th>{canManage && <th className="px-4 py-3">Ações</th>}
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">{order.annualEntries.map((entry) => <tr key={entry.id}>
                          <td className="whitespace-nowrap px-4 py-3">{entry.fiscalYear}</td><td className="whitespace-nowrap px-4 py-3">{entry.paymentProcessNumber}</td><td className="whitespace-nowrap px-4 py-3">{formatCurrency(entry.annualPaidValue)}</td><td className="whitespace-nowrap px-4 py-3">{formatCurrency(entry.glosasValue)}</td><td className="whitespace-nowrap px-4 py-3">{formatCurrency(entry.annualNetValue)}</td><td className="min-w-56 px-4 py-3">{entry.executionSummary}</td>
                          {canManage && <td className="whitespace-nowrap px-4 py-3"><div className="flex gap-2"><button type="button" onClick={() => openAnnualEntryForm(order, entry)} className="font-semibold text-amber-800 hover:underline">Editar</button><button type="button" onClick={() => void handleDeleteAnnualEntry(order, entry)} disabled={deletingId === entry.id} className="font-semibold text-red-700 hover:underline disabled:opacity-50">Excluir</button></div></td>}
                        </tr>)}</tbody>
                      </table>
                    </div> : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Nenhuma baixa anual registrada para esta OS.</p>}
                  </div> : <div className="p-5">
                    <h4 className="mb-3 text-sm font-semibold text-slate-800">Pagamentos mensais</h4>
                    {order.monthlyEntries.length ? <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-slate-50 uppercase text-slate-500"><tr>
                          <th className="px-4 py-3">Mês de referência</th><th className="px-4 py-3">Processo de pagamento (SEI)</th><th className="px-4 py-3">Empenho</th><th className="px-4 py-3">Valor pago</th><th className="px-4 py-3">Glosas</th><th className="px-4 py-3">Valor líquido</th><th className="px-4 py-3">Resumo da execução</th>{canManage && <th className="px-4 py-3">Ações</th>}
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">{order.monthlyEntries.map((entry) => <tr key={entry.id}>
                          <td className="whitespace-nowrap px-4 py-3">{formatMonth(entry.referenceMonth)}</td><td className="whitespace-nowrap px-4 py-3">{entry.paymentProcessNumber}</td><td className="whitespace-nowrap px-4 py-3">{entry.empenho}</td><td className="whitespace-nowrap px-4 py-3">{formatCurrency(entry.monthlyPaidValue)}</td><td className="whitespace-nowrap px-4 py-3">{formatCurrency(entry.glosasValue)}</td><td className="whitespace-nowrap px-4 py-3">{formatCurrency(entry.monthlyNetValue)}</td><td className="min-w-56 px-4 py-3">{entry.executionSummary}</td>
                          {canManage && <td className="whitespace-nowrap px-4 py-3"><div className="flex gap-2"><button type="button" onClick={() => openEntryForm(order, entry)} className="font-semibold text-amber-800 hover:underline">Editar</button><button type="button" onClick={() => void handleDeleteEntry(order, entry)} disabled={deletingId === entry.id} className="font-semibold text-red-700 hover:underline disabled:opacity-50">Excluir</button></div></td>}
                        </tr>)}</tbody>
                      </table>
                    </div> : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Nenhum pagamento registrado para esta OS.</p>}
                  </div>}
                </div>}
              </article>;
            })}
          </div>
        </section>

        <section>
          <div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Descentralização e saldo</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Controle financeiro por exercício</h2></div>
          {yearlySummary.map(({ year, allocated, paid, balance }) => {
            const documents = contract.financialDocuments.filter((document) => document.fiscalYear === year);
            return <article key={year} className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <header className="grid gap-3 bg-slate-50 p-5 sm:grid-cols-3"><Info label={`Total descentralizado em ${year}`} value={formatCurrency(allocated)} /><Info label={`Total pago em ${year}`} value={formatCurrency(paid)} /><Info label={`Saldo ano ${year}`} value={formatCurrency(balance)} /></header>
              <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-white text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Documento SEI</th><th className="px-5 py-3">Tipo / número</th><th className="px-5 py-3">Valor descentralizado</th><th className="px-5 py-3">Cobertura</th></tr></thead><tbody className="divide-y divide-slate-100">{documents.map((document) => <tr key={document.id}><td className="whitespace-nowrap px-5 py-3">{document.seiReference}</td><td className="px-5 py-3">{document.documentType} {document.documentNumber}</td><td className="whitespace-nowrap px-5 py-3">{formatCurrency(getFinancialDocumentSignedAmount(document))}</td><td className="px-5 py-3">{document.coverageDescription}</td></tr>)}</tbody></table></div>
            </article>;
          })}
        </section>
      </div>

      {modal && <DetailFormModal
        modal={modal}
        saving={saving}
        error={error}
        orderForm={orderForm}
        setOrderForm={setOrderForm}
        entryForm={entryForm}
        setEntryForm={setEntryForm}
        annualEntryForm={annualEntryForm}
        setAnnualEntryForm={setAnnualEntryForm}
        onClose={() => setModal(null)}
        onSubmit={handleSave}
      />}
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p></div>;
}

function Info({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={`rounded-lg border border-slate-200 bg-white p-3 ${wide ? "sm:col-span-2 xl:col-span-4" : ""}`}><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-900">{value}</p></div>;
}

function DetailFormModal({
  modal,
  saving,
  error,
  orderForm,
  setOrderForm,
  entryForm,
  setEntryForm,
  annualEntryForm,
  setAnnualEntryForm,
  onClose,
  onSubmit,
}: {
  modal: DetailModal;
  saving: boolean;
  error: string;
  orderForm: OrderForm;
  setOrderForm: Dispatch<SetStateAction<OrderForm>>;
  entryForm: EntryForm;
  setEntryForm: Dispatch<SetStateAction<EntryForm>>;
  annualEntryForm: AnnualEntryForm;
  setAnnualEntryForm: Dispatch<SetStateAction<AnnualEntryForm>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const isOrder = modal?.type === "order";
  const order = modal?.type === "order" ? modal.order : null;
  const entry = modal?.type === "entry" ? modal.entry : null;
  const annualEntry = modal?.type === "annualEntry" ? modal.entry : null;
  return <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
    <form onSubmit={onSubmit} className="my-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-slate-900">{isOrder ? (order ? "Editar ordem de serviço" : "Nova ordem de serviço") : modal?.type === "annualEntry" ? (annualEntry ? "Editar baixa anual" : "Nova baixa anual") : entry ? "Editar pagamento mensal" : "Novo pagamento mensal"}</h2><p className="mt-1 text-sm text-slate-600">Todos os campos marcados com * são obrigatórios.</p></div><button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">Fechar</button></div>
      {isOrder ? <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Número SIAF *"><input required value={orderForm.siafNumber} onChange={(event) => setOrderForm((current) => ({ ...current, siafNumber: event.target.value }))} className={inputClass} /></Field>
        <Field label="Número do documento SEI *"><input required value={orderForm.seiDocumentNumber} onChange={(event) => setOrderForm((current) => ({ ...current, seiDocumentNumber: event.target.value }))} className={inputClass} /></Field>
        <Field label="Vigência inicial da OS"><input type="date" value={orderForm.validFrom} onChange={(event) => setOrderForm((current) => ({ ...current, validFrom: event.target.value }))} className={inputClass} /></Field>
        <Field label="Vigência final da OS"><input type="date" value={orderForm.validTo} onChange={(event) => setOrderForm((current) => ({ ...current, validTo: event.target.value }))} className={inputClass} /></Field>
        <Field label="Descrição do serviço *" wide><input required value={orderForm.serviceDescription} onChange={(event) => setOrderForm((current) => ({ ...current, serviceDescription: event.target.value }))} className={inputClass} /></Field>
      </div> : modal?.type === "annualEntry" ? <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Exercício *"><input required type="number" min="1900" max="9999" step="1" value={annualEntryForm.fiscalYear} onChange={(event) => setAnnualEntryForm((current) => ({ ...current, fiscalYear: event.target.value }))} className={inputClass} /></Field>
        <Field label="Processo de pagamento (SEI) *"><input required value={annualEntryForm.paymentProcessNumber} onChange={(event) => setAnnualEntryForm((current) => ({ ...current, paymentProcessNumber: event.target.value }))} className={inputClass} /></Field>
        <Field label="Valor pago no exercício (R$) *"><input required type="number" min="0" step="0.01" value={annualEntryForm.annualPaidValue} onChange={(event) => setAnnualEntryForm((current) => ({ ...current, annualPaidValue: event.target.value }))} className={inputClass} /></Field>
        <Field label="Glosas (R$; use 0 se não houver) *"><input required type="number" min="0" step="0.01" value={annualEntryForm.glosasValue} onChange={(event) => setAnnualEntryForm((current) => ({ ...current, glosasValue: event.target.value }))} className={inputClass} /></Field>
        <Field label="Resumo da execução *" wide><textarea required rows={4} value={annualEntryForm.executionSummary} onChange={(event) => setAnnualEntryForm((current) => ({ ...current, executionSummary: event.target.value }))} className={inputClass} /></Field>
      </div> : <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Processo de pagamento (SEI) *"><input required value={entryForm.paymentProcessNumber} onChange={(event) => setEntryForm((current) => ({ ...current, paymentProcessNumber: event.target.value }))} className={inputClass} /></Field>
        <Field label="Mês de referência *"><input required type="month" value={entryForm.referenceMonth} onChange={(event) => setEntryForm((current) => ({ ...current, referenceMonth: event.target.value }))} className={inputClass} /></Field>
        <Field label="Valor pago mensalmente (R$) *"><input required type="number" min="0" step="0.01" value={entryForm.monthlyPaidValue} onChange={(event) => setEntryForm((current) => ({ ...current, monthlyPaidValue: event.target.value }))} className={inputClass} /></Field>
        <Field label="Glosas (R$; use 0 se não houver) *"><input required type="number" min="0" step="0.01" value={entryForm.glosasValue} onChange={(event) => setEntryForm((current) => ({ ...current, glosasValue: event.target.value }))} className={inputClass} /></Field>
        <Field label="Empenho *" wide><input required value={entryForm.empenho} onChange={(event) => setEntryForm((current) => ({ ...current, empenho: event.target.value }))} className={inputClass} /></Field>
        <Field label="Resumo da execução do contrato *" wide><textarea required rows={4} value={entryForm.executionSummary} onChange={(event) => setEntryForm((current) => ({ ...current, executionSummary: event.target.value }))} className={inputClass} /></Field>
      </div>}
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4"><button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button><button type="submit" disabled={saving} className="gov-button rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60">{saving ? "Salvando..." : "Salvar"}</button></div>
    </form>
  </div>;
}

const inputClass = "gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5";

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return <label className={`block text-sm font-medium text-slate-700 ${wide ? "sm:col-span-2" : ""}`}>{label}{children}</label>;
}