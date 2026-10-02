"use client";

import { Fragment, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Logo } from "@/components/Logo";
import PageHeader from "@/components/PageHeader";
import UserBadge from "@/components/UserBadge";
import { fetchJson, patchJson, postJson } from "@/lib/api";
import type { ContractMonthlyEntry, ContractRecord } from "@/types/contratos";

type ContractFormState = {
  serviceOrder: string;
  totalValue: string;
  paymentProcessNumber: string;
  monthlyPaidValue: string;
  glosasValue: string;
  referenceMonth: string;
  executionSummary: string;
  empenho: string;
};

type ModalState =
  | { type: "contract"; contract: ContractRecord | null }
  | { type: "entry"; contract: ContractRecord; entry: ContractMonthlyEntry | null }
  | null;

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const emptyForm = (): ContractFormState => ({
  serviceOrder: "",
  totalValue: "",
  paymentProcessNumber: "",
  monthlyPaidValue: "",
  glosasValue: "0.00",
  referenceMonth: currentMonth(),
  executionSummary: "",
  empenho: "",
});

const formatCurrency = (value: string | number) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatMonth = (value: string) => {
  const [year, month] = value.slice(0, 7).split("-");
  return `${month}/${year}`;
};

export function ContractsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [form, setForm] = useState<ContractFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canManage = ["admin", "editor"].includes(session?.user?.role ?? "");

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.id) {
      router.replace("/login");
      return;
    }

    const loadContracts = async () => {
      setLoading(true);
      try {
        const response = await fetchJson<{ data: ContractRecord[] }>("/api/contratos");
        setContracts(response.data ?? []);
        setError("");
      } catch (loadError) {
        setError((loadError as Error).message || "Não foi possível carregar os contratos.");
      } finally {
        setLoading(false);
      }
    };

    void loadContracts();
  }, [router, session?.user?.id, status]);

  const filteredContracts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalizedQuery) return contracts;
    return contracts.filter((contract) =>
      [
        contract.serviceOrder,
        ...contract.entries.flatMap((entry) => [
          entry.paymentProcessNumber,
          entry.empenho,
          entry.executionSummary,
        ]),
      ].some((value) => value.toLocaleLowerCase("pt-BR").includes(normalizedQuery))
    );
  }, [contracts, query]);

  const totals = useMemo(() => {
    const entries = contracts.flatMap((contract) => contract.entries);
    return {
      contractCount: contracts.length,
      monthlyPaid: entries.reduce((sum, entry) => sum + Number(entry.monthlyPaidValue), 0),
      deductions: entries.reduce((sum, entry) => sum + Number(entry.glosasValue), 0),
    };
  }, [contracts]);

  const refreshContracts = async () => {
    const response = await fetchJson<{ data: ContractRecord[] }>("/api/contratos");
    setContracts(response.data ?? []);
  };

  const openCreateContract = () => {
    setForm(emptyForm());
    setError("");
    setModal({ type: "contract", contract: null });
  };

  const openEditContract = (contract: ContractRecord) => {
    setForm({ ...emptyForm(), serviceOrder: contract.serviceOrder, totalValue: contract.totalValue });
    setError("");
    setModal({ type: "contract", contract });
  };

  const openEntryForm = (contract: ContractRecord, entry: ContractMonthlyEntry | null = null) => {
    setForm({
      ...emptyForm(),
      paymentProcessNumber: entry?.paymentProcessNumber ?? "",
      monthlyPaidValue: entry?.monthlyPaidValue ?? "",
      glosasValue: entry?.glosasValue ?? "0.00",
      referenceMonth: entry?.referenceMonth.slice(0, 7) ?? currentMonth(),
      executionSummary: entry?.executionSummary ?? "",
      empenho: entry?.empenho ?? "",
    });
    setError("");
    setModal({ type: "entry", contract, entry });
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);
    setError("");

    const entryPayload = {
      paymentProcessNumber: form.paymentProcessNumber,
      monthlyPaidValue: form.monthlyPaidValue,
      glosasValue: form.glosasValue,
      referenceMonth: form.referenceMonth,
      executionSummary: form.executionSummary,
      empenho: form.empenho,
    };

    try {
      if (modal.type === "contract" && modal.contract) {
        await patchJson(`/api/contratos/${encodeURIComponent(modal.contract.id)}`, {
          serviceOrder: form.serviceOrder,
          totalValue: form.totalValue,
        });
      } else if (modal.type === "contract") {
        await postJson("/api/contratos", {
          serviceOrder: form.serviceOrder,
          totalValue: form.totalValue,
          initialEntry: entryPayload,
        });
      } else if (modal.entry) {
        await patchJson(
          `/api/contratos/${encodeURIComponent(modal.contract.id)}/lancamentos/${encodeURIComponent(modal.entry.id)}`,
          entryPayload
        );
      } else {
        await postJson(`/api/contratos/${encodeURIComponent(modal.contract.id)}/lancamentos`, entryPayload);
      }

      await refreshContracts();
      setModal(null);
    } catch (saveError) {
      setError((saveError as Error).message || "Não foi possível salvar os dados.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContract = async (contract: ContractRecord) => {
    if (!window.confirm(`Excluir a ordem de serviço ${contract.serviceOrder} e todos os lançamentos associados?`)) return;
    setDeletingId(contract.id);
    setError("");
    try {
      await fetchJson(`/api/contratos/${encodeURIComponent(contract.id)}`, { method: "DELETE" });
      setContracts((current) => current.filter((item) => item.id !== contract.id));
    } catch (deleteError) {
      setError((deleteError as Error).message || "Não foi possível excluir o contrato.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteEntry = async (contract: ContractRecord, entry: ContractMonthlyEntry) => {
    if (!window.confirm(`Excluir o lançamento de ${formatMonth(entry.referenceMonth)}?`)) return;
    setDeletingId(entry.id);
    setError("");
    try {
      await fetchJson(
        `/api/contratos/${encodeURIComponent(contract.id)}/lancamentos/${encodeURIComponent(entry.id)}`,
        { method: "DELETE" }
      );
      setContracts((current) => current.map((item) => item.id === contract.id
        ? { ...item, entries: item.entries.filter((currentEntry) => currentEntry.id !== entry.id) }
        : item));
    } catch (deleteError) {
      setError((deleteError as Error).message || "Não foi possível excluir o lançamento.");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleExpanded = (contractId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(contractId)) next.delete(contractId);
      else next.add(contractId);
      return next;
    });
  };

  if (status === "loading" || loading) {
    return (
      <main className="gov-page-bg flex min-h-screen items-center justify-center">
        <p className="text-gov-muted">Carregando contratos...</p>
      </main>
    );
  }

  const showContractFields = modal?.type === "contract";
  const showEntryFields = modal?.type === "entry" || (modal?.type === "contract" && !modal.contract);

  return (
    <main className="gov-page-bg min-h-screen">
      <nav className="gov-header px-6 py-4 shadow-soft">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-4 rounded-lg px-3 py-2 text-left transition hover:bg-white/10" aria-label="Ir para o Dashboard">
            <Logo className="h-10 w-auto" width={40} height={40} alt="Horús" />
            <div>
              <h1 className="text-lg font-semibold text-white">Horús</h1>
              <p className="text-xs text-white/80">Portal de Gestão de Documentos</p>
            </div>
          </Link>
          <UserBadge />
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <PageHeader
          title="Contratos"
          subtitle="Ordens de serviço, valores e lançamentos mensais de execução."
          backHref="/dashboard"
          actions={canManage ? (
            <button type="button" onClick={openCreateContract} className="gov-button inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium">
              + Novo contrato
            </button>
          ) : null}
        />

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">Contratos</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{totals.contractCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">Total pago mensal</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(totals.monthlyPaid)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">Total de glosas</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(totals.deductions)}</p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="contract-search" className="mb-2 block text-sm font-medium text-slate-700">Buscar contrato ou lançamento</label>
          <input id="contract-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ordem de serviço, processo SEI, empenho ou resumo" className="gov-input w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm" />
        </div>

        {filteredContracts.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-5 py-4">Ordem de serviço</th>
                  <th className="px-5 py-4">Valor total</th>
                  <th className="px-5 py-4">Lançamentos</th>
                  <th className="px-5 py-4">Pago</th>
                  <th className="px-5 py-4">Último mês</th>
                  <th className="px-5 py-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContracts.map((contract) => {
                  const latestEntry = contract.entries[0];
                  const contractPaid = contract.entries.reduce((sum, entry) => sum + Number(entry.monthlyPaidValue), 0);
                  const expanded = expandedIds.has(contract.id);
                  return (
                    <Fragment key={contract.id}>
                      <tr>
                        <td className="px-5 py-4 font-semibold text-slate-900">{contract.serviceOrder}</td>
                        <td className="px-5 py-4 text-slate-700">{formatCurrency(contract.totalValue)}</td>
                        <td className="px-5 py-4 text-slate-700">{contract.entries.length}</td>
                        <td className="px-5 py-4 text-slate-700">{formatCurrency(contractPaid)}</td>
                        <td className="px-5 py-4 text-slate-700">{latestEntry ? formatMonth(latestEntry.referenceMonth) : "-"}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => toggleExpanded(contract.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                              {expanded ? "Ocultar meses" : "Ver meses"}
                            </button>
                            {canManage && <>
                              <button type="button" onClick={() => openEntryForm(contract)} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">Adicionar mês</button>
                              <button type="button" onClick={() => openEditContract(contract)} className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100">Editar</button>
                              <button type="button" onClick={() => void handleDeleteContract(contract)} disabled={deletingId === contract.id} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50">Excluir</button>
                            </>}
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={6} className="bg-slate-50/70 p-4 sm:p-6">
                            {contract.entries.length ? (
                              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                <table className="min-w-full text-left text-xs">
                                  <thead className="bg-slate-50 uppercase text-slate-500">
                                    <tr>
                                      <th className="px-4 py-3">Referência</th>
                                      <th className="px-4 py-3">Processo SEI</th>
                                      <th className="px-4 py-3">Empenho</th>
                                      <th className="px-4 py-3">Pago</th>
                                      <th className="px-4 py-3">Glosas</th>
                                      <th className="px-4 py-3">Resumo da execução</th>
                                      {canManage && <th className="px-4 py-3">Ações</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {contract.entries.map((entry) => (
                                      <tr key={entry.id}>
                                        <td className="whitespace-nowrap px-4 py-3">{formatMonth(entry.referenceMonth)}</td>
                                        <td className="whitespace-nowrap px-4 py-3">{entry.paymentProcessNumber}</td>
                                        <td className="whitespace-nowrap px-4 py-3">{entry.empenho}</td>
                                        <td className="whitespace-nowrap px-4 py-3">{formatCurrency(entry.monthlyPaidValue)}</td>
                                        <td className="whitespace-nowrap px-4 py-3">{formatCurrency(entry.glosasValue)}</td>
                                        <td className="min-w-56 px-4 py-3">{entry.executionSummary}</td>
                                        {canManage && <td className="whitespace-nowrap px-4 py-3">
                                          <div className="flex gap-2">
                                            <button type="button" onClick={() => openEntryForm(contract, entry)} className="font-semibold text-amber-800 hover:underline">Editar</button>
                                            <button type="button" onClick={() => void handleDeleteEntry(contract, entry)} disabled={deletingId === entry.id} className="font-semibold text-red-700 hover:underline disabled:opacity-50">Excluir</button>
                                          </div>
                                        </td>}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : <p className="text-sm text-slate-600">Nenhum lançamento mensal cadastrado.</p>}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-slate-900">{query ? "Nenhum contrato encontrado" : "Nenhum contrato cadastrado"}</h2>
            <p className="mt-2 text-sm text-slate-600">{query ? "Ajuste a busca e tente novamente." : "Cadastre uma ordem de serviço e seu primeiro lançamento mensal."}</p>
            {!query && canManage && <button type="button" onClick={openCreateContract} className="gov-button mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium">+ Novo contrato</button>}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
          <form onSubmit={handleSave} className="my-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {modal.type === "contract" ? (modal.contract ? "Editar contrato" : "Novo contrato") : modal.entry ? "Editar lançamento mensal" : "Novo lançamento mensal"}
                </h2>
                {modal.type === "entry" && <p className="mt-1 text-sm text-slate-600">Ordem de serviço: {modal.contract.serviceOrder}</p>}
              </div>
              <button type="button" onClick={() => setModal(null)} aria-label="Fechar formulário" className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">Fechar</button>
            </div>

            {showContractFields && <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Ordem de serviço *
                <input required value={form.serviceOrder} onChange={(event) => setForm((current) => ({ ...current, serviceOrder: event.target.value }))} className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
              </label>
              <label className="text-sm font-medium text-slate-700">Valor total (R$) *
                <input required type="number" min="0" step="0.01" value={form.totalValue} onChange={(event) => setForm((current) => ({ ...current, totalValue: event.target.value }))} className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
              </label>
            </div>}

            {showEntryFields && <>
              <div className="mb-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">Processo de pagamento (SEI) *
                  <input required value={form.paymentProcessNumber} onChange={(event) => setForm((current) => ({ ...current, paymentProcessNumber: event.target.value }))} className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
                </label>
                <label className="text-sm font-medium text-slate-700">Mês de referência *
                  <input required type="month" value={form.referenceMonth} onChange={(event) => setForm((current) => ({ ...current, referenceMonth: event.target.value }))} className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
                </label>
                <label className="text-sm font-medium text-slate-700">Valor pago mensalmente (R$) *
                  <input required type="number" min="0" step="0.01" value={form.monthlyPaidValue} onChange={(event) => setForm((current) => ({ ...current, monthlyPaidValue: event.target.value }))} className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
                </label>
                <label className="text-sm font-medium text-slate-700">Glosas (R$; use 0 se não houver) *
                  <input required type="number" min="0" step="0.01" value={form.glosasValue} onChange={(event) => setForm((current) => ({ ...current, glosasValue: event.target.value }))} className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
                </label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Empenho *
                  <input required value={form.empenho} onChange={(event) => setForm((current) => ({ ...current, empenho: event.target.value }))} className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
                </label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Resumo da execução do contrato *
                  <textarea required rows={4} value={form.executionSummary} onChange={(event) => setForm((current) => ({ ...current, executionSummary: event.target.value }))} className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
                </label>
              </div>
              <p className="mb-4 text-xs text-slate-500">Todos os campos marcados com * são obrigatórios. Não há anexos nesta versão.</p>
            </>}

            {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={saving} className="gov-button rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60">{saving ? "Salvando..." : "Salvar"}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}