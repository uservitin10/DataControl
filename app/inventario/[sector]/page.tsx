import Link from "next/link";
import { Logo } from "@/components/Logo";
import ServerUserBadge from "@/components/ServerUserBadge";
import { BackButton } from "@/components/BackButton";
import PageHeader from "@/components/PageHeader";
import { SectorInventoryTable } from "@/components/inventario/SectorInventoryTable";
import {
  equipmentData,
  getAllSectors,
  isSemSetorValue,
  normalizeSectorName,
  isActiveLicense,
  isLicenseType,
} from "@/lib/inventario";

type Props = {
  params: Promise<{
    sector?: string;
  }>;
};

export function generateStaticParams() {
  return getAllSectors().map((sector) => ({
    sector: sector === "Sem setor" ? "sem-setor" : sector,
  }));
}

export default async function SectorInventoryPage({ params }: Props) {
  const { sector: sectorName } = await params;

  if (!sectorName) {
    return (
      <main className="gov-page-bg min-h-screen">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="gov-card rounded-3xl border border-slate-200 bg-white p-10 shadow-soft text-center">
            <div className="mb-6 text-center">
              <BackButton href="/inventario" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 mb-4" label="Voltar ao inventário" />
              <h1 className="text-2xl font-semibold text-slate-900">Setor não especificado</h1>
              <p className="mt-4 text-slate-600">Verifique a URL e tente novamente.</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const normalizedSector = normalizeSectorName(sectorName);
  const isSemSetor = isSemSetorValue(normalizedSector);

  const excludedCGTOPItems = new Set([
    "Power BI Pro|gustavo.bruzzeguez@planejamento.gov.br",
    "Copilot Add-on|gustavo.bruzzeguez@planejamento.gov.br",
  ]);

  const isExcludedCGTOPItem = (item: { model?: string; assetId?: string }) =>
    normalizedSector === "cgtop" &&
    excludedCGTOPItems.has(`${item.model ?? ""}|${item.assetId ?? ""}`);

  const isInvalidDesktop = (item: {
    type?: string;
    allocatedUser?: string;
    assetId?: string;
    equipmentId?: string;
  }) =>
    item.type === "Desktop" &&
    !(item.allocatedUser ?? "").toString().trim() &&
    !(item.assetId ?? "").toString().trim() &&
    !(item.equipmentId ?? "").toString().trim();

  const sectorItems = equipmentData.filter((item) => {
    const normalizedItemSector = normalizeSectorName(item.sector);
    if (isExcludedCGTOPItem(item)) {
      return false;
    }
    if (isLicenseType(item.type)) {
      return false;
    }
    if (isInvalidDesktop(item)) {
      return false;
    }

    return isSemSetor
      ? normalizedItemSector === "" || normalizedItemSector === "sem setor"
      : normalizedItemSector === normalizedSector;
  });

  if (sectorItems.length === 0) {
    return (
      <main className="gov-page-bg min-h-screen">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="gov-card rounded-3xl border border-slate-200 bg-white p-10 shadow-soft text-center">
            <div className="mb-6 text-center">
              <BackButton href="/inventario" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 mb-4" label="Voltar ao inventário" />
              <h1 className="text-2xl font-semibold text-slate-900">Setor não encontrado</h1>
              <p className="mt-4 text-slate-600">Não há ativos cadastrados para este setor.</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // stats intentionally omitted (not used in this view)

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
            <ServerUserBadge />
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="gov-card rounded-3xl border border-slate-200 bg-white p-10 shadow-soft">
          <PageHeader
            title={
              <>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Setor</p>
                <h1 className="mt-2 text-3xl font-bold text-gov-heading">{isSemSetor ? "Sem setor" : sectorItems[0].sector}</h1>
              </>
            }
            subtitle={"Ativos cadastrados para este setor. Use esta página para verificar modelos, responsáveis e detalhes de cada item."}
            backHref="/inventario"
          />

          <SectorInventoryTable items={sectorItems} />
        </div>
      </div>
    </main>
  );
}
