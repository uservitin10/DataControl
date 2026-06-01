  "use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { supabase } from "@/lib/supabase";
import { fetchJson } from "@/lib/api";
import { equipmentData } from "@/lib/inventario";
import { SectorInventoryTable } from "@/components/inventario/SectorInventoryTable";

export default function LicencasPage() {
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

  const licenses = equipmentData
    .filter((item) => isActiveLicense(item))
    .slice()
    .sort((a, b) => {
      const nameA = (a.allocatedUser || a.responsible || a.assetId || '').toString().toLowerCase();
      const nameB = (b.allocatedUser || b.responsible || b.assetId || '').toString().toLowerCase();
      return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
    });

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

          <div className="flex flex-wrap items-center gap-3">
            <BackButton href="/inventario" />
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="gov-card rounded-3xl border border-slate-200 bg-white p-10 shadow-soft">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gov-heading">Todas as Licenças Ativas</h2>
            <p className="mt-2 text-base text-slate-600">
              Lista completa de licenças de software ativas no inventário.
            </p>
          </div>

          <div className="mb-8 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <p className="text-sm font-medium text-slate-600">Total de Licenças</p>
            <p className="mt-2 text-4xl font-bold text-gov-heading">{licenses.length}</p>
            <p className="mt-1 text-sm text-slate-500">licenças de software ativas</p>
          </div>

          {licenses.length > 0 ? (
            <SectorInventoryTable items={licenses} showExtendedFields={false} />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-slate-600">Nenhuma licença ativa encontrada no inventário.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
