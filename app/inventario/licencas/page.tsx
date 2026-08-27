  "use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
// BackButton provided via PageHeader
import PageHeader from "@/components/PageHeader";
import { useSession } from "next-auth/react";
import { fetchJson } from "@/lib/api";
import { getWarrantyExpiryStatus } from "@/lib/inventario";
import { SectorInventoryTable } from "@/components/inventario/SectorInventoryTable";

type MyInventoryResponse = {
  licenses: any[];
};

export default function LicencasPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loadingUser, setLoadingUser] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [licensesData, setLicensesData] = useState<any[]>([]);

  const expiringLicenseSummary = useMemo(() => {
    const items: any[] = [];
    let expired = 0;

    for (const item of licensesData) {
      const status = getWarrantyExpiryStatus(item.warranty);
      if (!status || status.status === "ok") {
        continue;
      }

      items.push(item);
      if (status.status === "expired") {
        expired += 1;
      }
    }

    return {
      items,
      total: items.length,
      expired,
    };
  }, [licensesData]);

  const normalizeLicenseItem = (item: any) => ({
    ...item,
    assetId: item.asset_id ?? item.assetId ?? undefined,
    equipmentId: item.equipment_id ?? item.equipmentId ?? undefined,
    allocatedUser: item.allocated_user ?? item.allocatedUser ?? undefined,
    equipmentState: item.equipment_state ?? item.equipmentState ?? undefined,
    assetType: item.asset_type ?? item.assetType ?? undefined,
  });

  useEffect(() => {
    const checkAccess = async () => {
      if (!session?.user?.id) {
        router.replace("/dashboard?alert=no_permission_inventario");
        return;
      }

      try {
        const profile = await fetchJson<{ success: boolean; data: { role: string } }>(
          `/api/profile/me`
        );

        if (profile.data.role !== "admin") {
          router.replace("/dashboard?alert=no_permission_inventario");
          return;
        }

        const inventoryResponse = await fetchJson<MyInventoryResponse>(
          "/api/inventario/meu-inventario"
        );

        setLicensesData((inventoryResponse.licenses ?? []).map(normalizeLicenseItem));
        setLoadingUser(false);
      } catch {
        router.replace("/dashboard?alert=no_permission_inventario");
      }
    };

    void checkAccess();
  }, [router, session]);

  const licenses = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return licensesData
      .slice()
      .filter((item) => {
        if (!normalizedSearch) return true;

        const valuesToMatch = [
          item.allocatedUser,
          item.responsible,
          item.model,
          item.type,
          item.assetId,
          item.equipmentId,
          item.sector,
          item.equipmentState,
        ]
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.toLowerCase());

        return valuesToMatch.some((value) => value.includes(normalizedSearch));
      })
      .sort((a, b) => {
        const modelA = (a.model || "").toString().trim();
        const modelB = (b.model || "").toString().trim();

        const modelSort = modelA.localeCompare(modelB, "pt-BR", { sensitivity: "base" });
        if (modelSort !== 0) return modelSort;

        const labelA = (a.responsible || a.allocatedUser || a.assetId || a.equipmentId || "")
          .toString()
          .trim();
        const labelB = (b.responsible || b.allocatedUser || b.assetId || b.equipmentId || "")
          .toString()
          .trim();

        return labelA.localeCompare(labelB, "pt-BR", { sensitivity: "base" });
      });
  }, [searchQuery, licensesData]);

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
            href="/inventario"
            className="flex items-center gap-4 rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
            aria-label="Ir para o Inventário"
          >
            <div>
              <h1 className="text-lg font-semibold text-white">Licenças Ativas</h1>
              <p className="text-xs text-white/80">Gestão de Licenças de Software</p>
            </div>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="gov-card rounded-3xl border border-slate-200 bg-white p-10 shadow-soft">
          <PageHeader title={<h2 className="text-3xl font-bold text-gov-heading">Todas as Licenças Ativas</h2>} subtitle={"Lista completa de licenças de software Ativas no inventário."} backHref="/inventario" />

          <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <label htmlFor="licenseSearch" className="block text-sm font-semibold text-slate-700">
              Buscar por nome, usuário, modelo ou setor
            </label>
            <input
              id="licenseSearch"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Digite um nome, modelo ou setor..."
              className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/20"
            />
          </div>

          <div className="mb-8 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <p className="text-sm font-medium text-slate-600">Total de Licenças</p>
            <p className="mt-2 text-4xl font-bold text-gov-heading">{licenses.length}</p>
            <p className="mt-1 text-sm text-slate-500">licenças de software Ativas</p>
          </div>

          {expiringLicenseSummary.total > 0 && (
            <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm">
              <p className="text-sm font-semibold">
                {expiringLicenseSummary.total} licença(s) com prazo de validade próximo.
              </p>
              <p className="mt-2 text-sm text-amber-900">
                {expiringLicenseSummary.expired > 0 && `${expiringLicenseSummary.expired} já vencida(s).`}
                {expiringLicenseSummary.total - expiringLicenseSummary.expired > 0 && ` ${expiringLicenseSummary.total - expiringLicenseSummary.expired} vence(m) em até 30 dias.`}
              </p>
            </div>
          )}

          {licenses.length > 0 ? (
            <SectorInventoryTable items={licenses} showExtendedFields={false} showEmail={true} showDetailsButton={false} />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-slate-600">Nenhuma licença Ativa encontrada no inventário.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
