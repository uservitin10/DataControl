"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Logo } from "@/components/Logo";
import PageHeader from "@/components/PageHeader";
import UserBadge from "@/components/UserBadge";
import { fetchJson, patchJson, postJson } from "@/lib/api";
import { getAvailableBalance, getDecentralizedTotal } from "@/lib/contract-calculations";
import type { ContractRecord } from "@/types/contratos";

type ContractFormState = {
  name: string;
  totalValue: string;
  executionSummary: string;
  paymentFrequency: "monthly" | "annual";
  contractValidFrom: string;
  contractValidTo: string;
  siafNumber: string;
  seiDocumentNumber: string;
  validFrom: string;
  validTo: string;
  serviceDescription: string;
  paymentProcessNumber: string;
  monthlyPaidValue: string;
  glosasValue: string;
  referenceMonth: string;
  monthlyExecutionSummary: string;
  empenho: string;
};

type ModalState = { type: "contract"; contract: ContractRecord | null } | null;

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const emptyForm = (): ContractFormState => ({
  name: "",
  totalValue: "",
  executionSummary: "",
  paymentFrequency: "monthly",
  contractValidFrom: "",
  contractValidTo: "",
  siafNumber: "",
  seiDocumentNumber: "",
  validFrom: "",
  validTo: "",
  serviceDescription: "",
  paymentProcessNumber: "",
  monthlyPaidValue: "",
  glosasValue: "0.00",
  referenceMonth: currentMonth(),
  monthlyExecutionSummary: "",
  empenho: "",
});

const formatCurrency = (value: string | number) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
    return contracts.filter((contract) => {
      const searchable = [
        contract.name,
        contract.executionSummary,
        ...contract.serviceOrders.flatMap((order) => [
          order.siafNumber,
          order.seiDocumentNumber,
          order.serviceDescription,
          ...order.monthlyEntries.flatMap((entry) => [entry.paymentProcessNumber, entry.empenho, entry.executionSummary]),
          ...order.annualEntries.map((entry) => `${entry.paymentProcessNumber} ${entry.fiscalYear} ${entry.executionSummary}`),
        ]),
        ...contract.financialDocuments.flatMap((document) => [document.documentNumber, document.seiReference, document.coverageDescription]),
      ];
      return searchable.some((value) => value.toLocaleLowerCase("pt-BR").includes(normalizedQuery));
    });
  }, [contracts, query]);

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
    setForm({
      ...emptyForm(),
      name: contract.name,
      totalValue: contract.totalValue,
      executionSummary: contract.executionSummary,
      paymentFrequency: contract.paymentFrequency,
      contractValidFrom: contract.validFrom ?? "",
      contractValidTo: contract.validTo ?? "",
    });
    setError("");
    setModal({ type: "contract", contract });
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modal) return;
    setSaving(true);
    setError("");

    try {
      if (modal.type === "contract" && modal.contract) {
        await patchJson(`/api/contratos/${encodeURIComponent(modal.contract.id)}`, {
          name: form.name,
          totalValue: form.totalValue,
          executionSummary: form.executionSummary,
          paymentFrequency: form.paymentFrequency,
          validFrom: form.contractValidFrom || null,
          validTo: form.contractValidTo || null,
        });
      } else {
        await postJson("/api/contratos", {
          name: form.name,
          totalValue: form.totalValue,
          executionSummary: form.executionSummary,
          paymentFrequency: form.paymentFrequency,
          validFrom: form.contractValidFrom || null,
          validTo: form.contractValidTo || null,
          initialServiceOrder: {
            siafNumber: form.siafNumber,
            seiDocumentNumber: form.seiDocumentNumber,
            validFrom: form.validFrom,
            validTo: form.validTo,
            serviceDescription: form.serviceDescription,
          },
          ...(form.paymentFrequency === "monthly" ? { initialEntry: {
            paymentProcessNumber: form.paymentProcessNumber,
            monthlyPaidValue: form.monthlyPaidValue,
            glosasValue: form.glosasValue,
            referenceMonth: form.referenceMonth,
            executionSummary: form.monthlyExecutionSummary,
            empenho: form.empenho,
          } } : {}),
        });
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
    if (!window.confirm(`Excluir o contrato ${contract.name} e todas as ordens de serviço associadas?`)) return;
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

  if (status === "loading" || loading) {
    return (
      <main className="gov-page-bg flex min-h-screen items-center justify-center">
        <p className="text-gov-muted">Carregando contratos...</p>
      </main>
    );
  }

  const creatingContract = modal?.type === "contract" && !modal.contract;

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

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="contract-search" className="mb-2 block text-sm font-medium text-slate-700">Buscar contrato ou lançamento</label>
          <input id="contract-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ordem de serviço, processo SEI, empenho ou resumo" className="gov-input w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm" />
        </div>

        {filteredContracts.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-5 py-4">Contrato</th>
                  <th className="px-5 py-4">Ordens de serviço</th>
                  <th className="px-5 py-4">Valor total</th>
                  <th className="px-5 py-4">Total descentralizado</th>
                  <th className="px-5 py-4">Total pago</th>
                  <th className="px-5 py-4">Saldo disponível</th>
                  <th className="px-5 py-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContracts.map((contract) => {
                  const monthlyEntries = contract.serviceOrders.flatMap((order) => order.monthlyEntries);
                  const annualEntries = contract.serviceOrders.flatMap((order) => order.annualEntries);
                  const entries = [
                    ...monthlyEntries.map((entry) => ({ monthlyPaidValue: entry.monthlyPaidValue })),
                    ...annualEntries.map((entry) => ({ monthlyPaidValue: entry.annualPaidValue })),
                  ];
                  const paid = entries.reduce((sum, entry) => sum + Number(entry.monthlyPaidValue), 0);
                  const decentralized = getDecentralizedTotal(contract.financialDocuments);
                  const balance = getAvailableBalance(contract.financialDocuments, entries);
                  return <tr key={contract.id}>
                    <td className="px-5 py-4">
                      <Link href={`/contratos/${encodeURIComponent(contract.id)}`} className="font-semibold text-blue-800 underline decoration-blue-300 underline-offset-2 hover:text-blue-950">{contract.name}</Link>
                      <p className="mt-1 max-w-md truncate text-xs text-slate-500">{contract.executionSummary}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{contract.serviceOrders.length}</td>
                    <td className="px-5 py-4 text-slate-700">{formatCurrency(contract.totalValue)}</td>
                    <td className="px-5 py-4 text-slate-700">{formatCurrency(decentralized)}</td>
                    <td className="px-5 py-4 text-slate-700">{formatCurrency(paid)}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">{formatCurrency(balance)}</td>
                    <td className="px-5 py-4">
                      {canManage && <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => openEditContract(contract)} className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100">Editar</button>
                        <button type="button" onClick={() => void handleDeleteContract(contract)} disabled={deletingId === contract.id} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50">Excluir</button>
                      </div>}
                    </td>
                  </tr>;
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
          <form onSubmit={handleSave} className="my-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {modal.contract ? "Editar contrato" : "Novo contrato"}
                </h2>
              </div>
              <button type="button" onClick={() => setModal(null)} aria-label="Fechar formulário" className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">Fechar</button>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Nome do contrato *
                <input required value={form.name} onChange={(event) => setForm((current) => {
                  const name = event.target.value;
                  const paymentFrequency = name.trim().toLocaleLowerCase("pt-BR") === "gartner" ? "annual" : "monthly";
                  return { ...current, name, paymentFrequency };
                })} className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
              </label>
              <label className="text-sm font-medium text-slate-700">Valor total (R$) *
                <input required type="number" min="0" step="0.01" value={form.totalValue} onChange={(event) => setForm((current) => ({ ...current, totalValue: event.target.value }))} className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
              </label>
              <div className="text-sm font-medium text-slate-700">
                <p>Periodicidade das baixas</p>
                <p className="mt-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5">{form.paymentFrequency === "annual" ? "Anual" : "Mensal"}</p>
              </div>
              <label className="text-sm font-medium text-slate-700">Início da vigência do contrato
                <input type="date" value={form.contractValidFrom} onChange={(event) => setForm((current) => ({ ...current, contractValidFrom: event.target.value }))} className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
              </label>
              <label className="text-sm font-medium text-slate-700">Fim da vigência do contrato
                <input type="date" value={form.contractValidTo} onChange={(event) => setForm((current) => ({ ...current, contractValidTo: event.target.value }))} className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Resumo da execução do contrato *
                <textarea required rows={3} value={form.executionSummary} onChange={(event) => setForm((current) => ({ ...current, executionSummary: event.target.value }))} className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
              </label>
            </div>

            {creatingContract && <>
              <h3 className="mb-3 border-t border-slate-200 pt-5 text-base font-semibold text-slate-900">Primeira ordem de serviço</h3>
              <div className="mb-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">Número SIAF *
                  <input required value={form.siafNumber} onChange={(event) => setForm((current) => ({ ...current, siafNumber: event.target.value }))} className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
                </label>
                <label className="text-sm font-medium text-slate-700">Número do documento SEI *
                  <input required value={form.seiDocumentNumber} onChange={(event) => setForm((current) => ({ ...current, seiDocumentNumber: event.target.value }))} className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
                </label>
                <label className="text-sm font-medium text-slate-700">Vigência inicial da OS
                  <input type="date" value={form.validFrom} onChange={(event) => setForm((current) => ({ ...current, validFrom: event.target.value }))} className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
                </label>
                <label className="text-sm font-medium text-slate-700">Vigência final da OS
                  <input type="date" value={form.validTo} onChange={(event) => setForm((current) => ({ ...current, validTo: event.target.value }))} className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
                </label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Descrição do serviço *
                  <input required value={form.serviceDescription} onChange={(event) => setForm((current) => ({ ...current, serviceDescription: event.target.value }))} className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
                </label>
              </div>

              {form.paymentFrequency === "monthly" && <>
              <h3 className="mb-3 border-t border-slate-200 pt-5 text-base font-semibold text-slate-900">Primeiro lançamento mensal</h3>
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
                  <textarea required rows={4} value={form.monthlyExecutionSummary} onChange={(event) => setForm((current) => ({ ...current, monthlyExecutionSummary: event.target.value }))} className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" />
                </label>
              </div>
              <p className="mb-4 text-xs text-slate-500">Os campos marcados com * são obrigatórios. Glosas devem ser preenchidas com 0,00 quando não houver. Não há anexos nesta versão.</p>
              </>}
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