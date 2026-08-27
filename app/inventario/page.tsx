"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ROLE_LABELS } from "@/lib/ui-constants";
import PageHeader from "@/components/PageHeader";
import { useSession } from "next-auth/react";
import { fetchJson } from "@/lib/api";
import {
  getAllSectors,
  getWarrantyExpiryStatus,
  isActiveLicense,
  normalizeType,
  getEquipmentTypeCount,
  isSemSetorValue,
} from "@/lib/inventario";

export default function InventarioPage() {
  const router = useRouter();
  const [loadingUser, setLoadingUser] = useState(true);
  const [userPresent, setUserPresent] = useState(false);
  const [displayNameState, setDisplayNameState] = useState<string | null>(null);
  const [roleState, setRoleState] = useState<string | null>(null);
  const [inventoryEquipments, setInventoryEquipments] = useState<any[]>([]);
  const [inventoryLicenses, setInventoryLicenses] = useState<any[]>([]);

  const expiringInventorySummary = useMemo(() => {
    const allItems = [...inventoryEquipments, ...inventoryLicenses];
    let totalExpiring = 0;
    let totalExpired = 0;
    let totalLicenses = 0;
    let totalWarranties = 0;

    allItems.forEach((item) => {
      const status = getWarrantyExpiryStatus(item.warranty);
      if (!status || status.status === "ok") {
        return;
      }

      totalExpiring += 1;
      if (status.status === "expired") {
        totalExpired += 1;
      }

      const typeValue = (item.type ?? "").toString().toLowerCase();
      if (typeValue === "licença" || typeValue === "licenca") {
        totalLicenses += 1;
      } else {
        totalWarranties += 1;
      }
    });

    return { totalExpiring, totalExpired, totalLicenses, totalWarranties };
  }, [inventoryEquipments, inventoryLicenses]);

  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user?.id) {
      router.replace("/dashboard?alert=no_permission_inventario");
      return;
    }

    const loadData = async () => {
      try {
        const profile = await fetchJson<{
          success: boolean;
          data: { role: string; display_name?: string };
        }>(`/api/profile/me`);

        if (profile.data.role !== "admin") {
          router.replace("/dashboard?alert=no_permission_inventario");
          return;
        }

        setUserPresent(true);
        setDisplayNameState(profile.data.display_name ?? session.user?.email ?? null);
        setRoleState(profile.data.role ?? null);

        const inventoryResponse = await fetchJson<{
          success: boolean;
          data: {
            equipments: any[];
            licenses: any[];
          };
        }>("/api/inventario");

        // Extração correta a partir da propriedade .data
        const equipmentsList = inventoryResponse.data?.equipments ?? [];
        const licensesList = inventoryResponse.data?.licenses ?? [];

        setInventoryEquipments(equipmentsList);
        setInventoryLicenses(licensesList);
      } catch (err) {
        console.error("Erro ao carregar inventário:", err);
        router.replace("/dashboard?alert=no_permission_inventario");
      } finally {
        setLoadingUser(false);
      }
    };

    void loadData();
  }, [status, session?.user?.id, router]);

  const stats = useMemo(() => {
    const totalEquipments = inventoryEquipments.length;
    const totalLicenses = inventoryLicenses.length;
    return {
      total: totalEquipments + totalLicenses,
      monitors: getEquipmentTypeCount(inventoryEquipments, "Monitor"),
      desktops: getEquipmentTypeCount(inventoryEquipments, "Desktop"),
      notebooks: getEquipmentTypeCount(inventoryEquipments, "Notebook"),
      licenses: inventoryLicenses.length,
    };
  }, [inventoryEquipments, inventoryLicenses]);

  const equipmentSectorNames = useMemo(() => {
    return getAllSectors(inventoryEquipments);
  }, [inventoryEquipments]);

  const sectorSummaries = useMemo(() => {
    return equipmentSectorNames.map((sector) => {
      const items =
        sector === "Sem setor"
          ? inventoryEquipments.filter(
              (item) =>
                !(item.sector ?? "").toString().trim() ||
                isSemSetorValue((item.sector ?? "").toString())
            )
          : inventoryEquipments.filter(
              (item) => (item.sector ?? "").toString().trim() === sector
            );

      return {
        sector,
        total: items.length,
        monitors: getEquipmentTypeCount(items, "Monitor"),
        desktops: getEquipmentTypeCount(items, "Desktop"),
        notebooks: getEquipmentTypeCount(items, "Notebook"),
      };
    });
  }, [equipmentSectorNames, inventoryEquipments]);

  const licensesSummary = useMemo(() => {
    return {
      sector: "Licenças",
      total: inventoryLicenses.length,
      monitors: 0,
      desktops: 0,
      notebooks: 0,
    };
  }, [inventoryLicenses]);

  const allSectorSummaries = [...sectorSummaries, licensesSummary];

  const activeSectorSummaries = sectorSummaries.filter((summary) => summary.total > 0);
  const visibleSectorSummaries = [...activeSectorSummaries, licensesSummary];

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
            <Logo className="h-10 w-auto hover-scale" width={40} height={40} alt="Horús" />
            <div>
              <h1 className="text-lg font-semibold text-white">Horús</h1>
              <p className="text-xs text-white/80">Portal de Gestão de Documentos</p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            {userPresent ? (
              <button
                type="button"
                onClick={() => router.push("/dashboard/profile")}
                className="gov-button-secondary-dark inline-flex items-center gap-3 rounded-full px-4 py-1.5 text-sm font-medium"
                aria-label={displayNameState ?? "Usuário"}
                title={displayNameState ?? "Usuário"}
              >
                <span className="text-sm text-white/95 truncate max-w-[160px]">{displayNameState ?? "Usuário"}</span>
                <span className={`gov-badge role-${roleState ?? "viewer"}`}>{ROLE_LABELS?.[(roleState ?? "viewer") as keyof typeof ROLE_LABELS] ?? (roleState ?? "viewer")}</span>
              </button>
            ) : null}
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="gov-card rounded-3xl border border-slate-200 bg-white p-10 shadow-soft">
          <PageHeader
            title="Gestão de Inventário"
            subtitle={
              "Aqui você encontra todos os ativos cadastrados no sistema com informações detalhadas sobre modelos, responsáveis e status de funcionamento."
            }
            backHref="/dashboard"
          />

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
              <p className="mt-2 text-3xl font-bold text-teal-700">{stats.notebooks}</p>
              <p className="mt-1 text-xs text-slate-500">{stats.total > 0 ? Math.round((stats.notebooks / stats.total) * 100) : 0}% do total</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-6">
              <p className="text-sm font-medium text-slate-600">Licenças Ativas</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">{stats.licenses}</p>
              <p className="mt-1 text-xs text-slate-500">{stats.total > 0 ? Math.round((stats.licenses / stats.total) * 100) : 0}% do total</p>
            </div>
          </div>

          {expiringInventorySummary.totalExpiring > 0 && (
            <div className="mb-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
              <p className="text-sm font-semibold">
                {expiringInventorySummary.totalExpiring} {expiringInventorySummary.totalExpiring === 1 ? "item" : "itens"} com garantia ou licença perto do vencimento.
              </p>
              <p className="mt-2 text-sm text-amber-900">
                {expiringInventorySummary.totalWarranties > 0 && `${expiringInventorySummary.totalWarranties} garantia(s) próximas.`}
                {expiringInventorySummary.totalLicenses > 0 && ` ${expiringInventorySummary.totalLicenses} licença(s) próximas.`}
                {expiringInventorySummary.totalExpired > 0 && ` ${expiringInventorySummary.totalExpired} vencido(s).`}
              </p>
            </div>
          )}

          <div className="mb-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Resumo por setor</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Visão geral dos setores</h2>
              </div>
              <p className="text-sm text-slate-500">{activeSectorSummaries.length} setores com ativos</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleSectorSummaries.map((summary, index) => {
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
                      {isLicensesCard ? null : (
                        <>
                          <div className="rounded-2xl bg-white p-3 text-xs font-medium text-slate-700">
                            <p className="text-slate-500">Monitores</p>
                            <p className="mt-1 text-lg font-semibold">{summary.monitors}</p>
                          </div>
                          <div className="rounded-2xl bg-white p-3 text-xs font-medium text-slate-700">
                            <p className="text-slate-500">Notebooks</p>
                            <p className="mt-1 text-lg font-semibold">{summary.notebooks}</p>
                          </div>
                          <div className="rounded-2xl bg-white p-3 text-xs font-medium text-slate-700">
                            <p className="text-slate-500">Desktops</p>
                            <p className="mt-1 text-lg font-semibold">{summary.desktops}</p>
                          </div>
                        </>
                      )}
                    </div>
                    <p className="mt-4 text-sm text-slate-500">
                      {isLicensesCard
                        ? "Todas as licenças Ativas do inventário"
                        : "Clique para ver a página de ativos deste setor."}
                    </p>
                  </>
                );

                if (isLicensesCard) {
                  return (
                    <Link
                      key={`${summary.sector}-${index}`}
                      href="/inventario/licencas"
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-slate-300 hover:bg-white"
                      aria-label="Abrir página de licenças Ativas"
                    >
                      {cardContent}
                    </Link>
                  );
                }

                return (
                  <Link
                    key={`${summary.sector}-${index}`}
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