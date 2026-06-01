import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SectorInventoryTable } from "@/components/inventario/SectorInventoryTable";
import {
  equipmentData,
  getAllSectors,
  isSemSetorValue,
  normalizeSectorName,
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
            <h1 className="text-2xl font-semibold text-slate-900">Setor não especificado</h1>
            <p className="mt-4 text-slate-600">Verifique a URL e tente novamente.</p>
            <div className="mt-6">
              <Link href="/inventario" className="gov-button-secondary-dark rounded-lg px-4 py-2 text-sm font-medium">
                Voltar ao inventário
              </Link>
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

  const sectorItems = equipmentData.filter((item) => {
    const normalizedItemSector = normalizeSectorName(item.sector);
    if (isExcludedCGTOPItem(item)) {
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
            <h1 className="text-2xl font-semibold text-slate-900">Setor não encontrado</h1>
            <p className="mt-4 text-slate-600">Não há ativos cadastrados para este setor.</p>
            <div className="mt-6">
              <Link href="/inventario" className="gov-button-secondary-dark rounded-lg px-4 py-2 text-sm font-medium">
                Voltar ao inventário
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const stats = {
    total: sectorItems.length,
    monitors: sectorItems.filter((item) => item.type === "Monitor").length,
    desktops: sectorItems.filter((item) => item.type === "Desktop").length,
    notebooks: sectorItems.filter((item) => item.type === "Notebook").length,
  };

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
            <Link
              href="/dashboard/profile"
              className="gov-button-secondary-dark rounded-lg px-3 py-2 text-sm font-medium"
            >
              Meu Perfil
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="gov-card rounded-3xl border border-slate-200 bg-white p-10 shadow-soft">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Setor</p>
              <h1 className="mt-2 text-3xl font-bold text-gov-heading">
                {isSemSetor ? "Sem setor" : sectorItems[0].sector}
              </h1>
              <p className="mt-2 text-base text-slate-600">
                Ativos cadastrados para este setor. Use esta página para verificar modelos, responsáveis e detalhes de cada item.
              </p>
            </div>
            <Link
              href="/inventario"
              className="gov-button rounded-lg px-4 py-3 text-sm font-medium"
            >
              Voltar
            </Link>
          </div>

          <SectorInventoryTable items={sectorItems} />
        </div>
      </div>
    </main>
  );
}
