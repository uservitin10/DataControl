"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import { fetchJson } from "@/lib/api";
import { equipmentData } from "@/lib/inventario";

export default function InventarioPage() {
  const router = useRouter();
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user ?? null;
      if (!sessionUser) {
        router.replace("/dashboard?alert=no_permission_inventario");
        return;
      }

      try {
        const profile = await fetchJson<{ role: string }>(
          `/api/profile?id=${encodeURIComponent(sessionUser.id)}`
        );

        if (profile.role !== "admin") {
          router.replace("/dashboard?alert=no_permission_inventario");
          return;
        }

        setLoadingUser(false);
      } catch {
        router.replace("/dashboard?alert=no_permission_inventario");
      }
    };

    void checkAccess();
  }, [router]);

  const isActiveLicense = (item: { type: string; equipmentState?: string }) =>
    item.type === "Licença" &&
    ["ativa", "ativo"].includes((item.equipmentState ?? "").toLowerCase());

  const stats = {
    total: equipmentData.length,
    monitors: equipmentData.filter((i) => i.type === "Monitor").length,
    desktops: equipmentData.filter((i) => i.type === "Desktop").length,
    Notebooks: equipmentData.filter((i) => i.type === "Notebooks").length,
    licenses: equipmentData.filter((i) => isActiveLicense(i)).length,
  };

  const extraSectorOptions = [
    "SEPLAN",
    "SE",
    "SEAID",
    "CONJUR",
    "ASTEC",
    "ASPAR",
    "IMPRENSA",
    "AECI",
    "CGEST",
    "COLOG",
    "AGENDA",
  ];

  const sectorSummaries = Array.from(
    new Set(
      [
        ...equipmentData.map((i) => (i.sector ?? "").toString().trim()),
        ...extraSectorOptions,
        "Sem setor",
        "Licenças",
      ]
    )
  )
    .map((s) => (s ?? "").toString().trim())
    .filter(Boolean)
    .sort()
    .map((sector) => {
      let items: typeof equipmentData = [];
      
      if (sector === "Licenças") {
        items = equipmentData.filter((item) => isActiveLicense(item));
      } else if (sector === "Sem setor") {
        items = equipmentData.filter(
          (item) =>
            !(item.sector ?? "").toString().trim() &&
            !isActiveLicense(item)
        );
      } else {
        items = equipmentData.filter(
          (item) =>
            (item.sector ?? "").toString().trim() === sector &&
            !isActiveLicense(item)
        );
      }
      
      return {
        sector,
        total: items.length,
        monitors: items.filter((item) => item.type === "Monitor").length,
        desktops: items.filter((item) => item.type === "Desktop").length,
        notebooks: items.filter((item) => item.type === "Notebook").length,
        licenses: items.filter((item) => isActiveLicense(item)).length,
      };
    });

  const activeSectorSummaries = sectorSummaries.filter((summary) => summary.total > 0);

  if (loadingUser) {
    return (
      <main className="gov-page-bg flex min-h-screen items-center justify-center">
        <p className="text-gov-muted">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="gov-page-bg min-h-screen">
      <nav className="gov-header px-6 py-4 shadow-soft">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-4 rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
            aria-label="Ir para o Dashboard"
          >
            <Logo className="h-10 w-auto hover-scale" width={40} height={40} alt="Data Control" />
            <div>
              <h1 className="text-lg font-semibold text-white">Data Control</h1>
              <p className="text-xs text-white/80">Portal de Gestão de Documentos</p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard/profile")}
              className="gov-button-secondary-dark rounded-lg px-3 py-2 text-sm font-medium"
            >
              Meu Perfil
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="gov-card rounded-3xl border border-slate-200 bg-white p-10 shadow-soft">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gov-heading">Gestão de Inventário</h1>
            <p className="mt-2 text-base text-slate-600">
              Aqui você encontra todos os ativos cadastrados no sistema com informações detalhadas sobre modelos, responsáveis e status de funcionamento.
            </p>
          </div>

          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-6">
              <p className="text-sm font-medium text-slate-600">Total de Ativos</p>
              <p className="mt-2 text-3xl font-bold text-gov-heading">{stats.total}</p>
              <p className="mt-1 text-xs text-slate-500">ativos no inventário</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6">
              <p className="text-sm font-medium text-slate-600">Monitores</p>
              <p className="mt-2 text-3xl font-bold text-blue-700">{stats.monitors}</p>
              <p className="mt-1 text-xs text-slate-500">{stats.total > 0 ? Math.round((stats.monitors / stats.total) * 100) : 0}% do total</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 to-amber-100 p-6">
              <p className="text-sm font-medium text-slate-600">Desktops</p>
              <p className="mt-2 text-3xl font-bold text-amber-700">{stats.desktops}</p>
              <p className="mt-1 text-xs text-slate-500">{stats.total > 0 ? Math.round((stats.desktops / stats.total) * 100) : 0}% do total</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-teal-50 to-teal-100 p-6">
              <p className="text-sm font-medium text-slate-600">Notebooks</p>
              <p className="mt-2 text-3xl font-bold text-teal-700">{stats.Notebooks}</p>
              <p className="mt-1 text-xs text-slate-500">{stats.total > 0 ? Math.round((stats.Notebooks / stats.total) * 100) : 0}% do total</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-6">
              <p className="text-sm font-medium text-slate-600">Licenças ativas</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">{stats.licenses}</p>
              <p className="mt-1 text-xs text-slate-500">{stats.total > 0 ? Math.round((stats.licenses / stats.total) * 100) : 0}% do total</p>
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Resumo por setor</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Visão geral dos setores</h2>
              </div>
              <p className="text-sm text-slate-500">{activeSectorSummaries.length} setores com ativos</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {activeSectorSummaries.map((summary) => {
                const isLicensesCard = summary.sector === "Licenças";
                
                const cardContent = (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-800">{summary.sector}</p>
                      <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] bg-slate-100 text-slate-600">
                        {summary.total}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      <div className="rounded-2xl bg-white p-3 text-xs font-medium text-slate-700">
                        <p className="text-slate-500">Total</p>
                        <p className="mt-1 text-lg font-semibold">{summary.total}</p>
                      </div>
                      <div className="rounded-2xl bg-white p-3 text-xs font-medium text-slate-700">
                        <p className="text-slate-500">Monitores</p>
                        <p className="mt-1 text-lg font-semibold">{summary.monitors}</p>
                      </div>
                      <div className="rounded-2xl bg-white p-3 text-xs font-medium text-slate-700">
                        <p className="text-slate-500">notebooks</p>
                        <p className="mt-1 text-lg font-semibold">{summary.notebooks}</p>
                      </div>
                      <div className="rounded-2xl bg-white p-3 text-xs font-medium text-slate-700">
                        <p className="text-slate-500">Desktops</p>
                        <p className="mt-1 text-lg font-semibold">{summary.desktops}</p>
                      </div>
                      <div className="rounded-2xl bg-white p-3 text-xs font-medium text-slate-700">
                        <p className="text-slate-500">Licenças</p>
                        <p className="mt-1 text-lg font-semibold">{summary.licenses}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-slate-500">
                      {isLicensesCard
                        ? "Todas as licenças ativas do inventário"
                        : "Clique para ver a página de ativos deste setor."}
                    </p>
                  </>
                );

                if (isLicensesCard) {
                  return (
                    <Link
                      key={summary.sector}
                      href="/inventario/licencas"
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-slate-300 hover:bg-white"
                      aria-label="Abrir página de licenças ativas"
                    >
                      {cardContent}
                    </Link>
                  );
                }

                return (
                  <Link
                    key={summary.sector}
                    href={`${
                      summary.sector === "Sem setor"
                        ? "/inventario/sem-setor"
                        : `/inventario/${encodeURIComponent(summary.sector)}`
                    }`}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-slate-300 hover:bg-white"
                    aria-label={`Abrir inventário do setor ${summary.sector}`}
                  >
                    {cardContent}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-slate-600">Clique em um card de setor para navegar até a página com ativos desse setor.</p>
          </div>
        </div>
      </div>
    </main>
  );
}