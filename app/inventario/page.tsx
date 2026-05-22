"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import { fetchJson } from "@/lib/api";
import { equipmentData } from "@/lib/inventario";

export default function InventarioPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("todos");
  const [filterSector, setFilterSector] = useState<string>("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingUser, setLoadingUser] = useState(true);
  const itemsPerPage = 10;

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

  const filteredData = useMemo(() => {
    return equipmentData.filter((item) => {
      const matchSearch =
        searchTerm === "" ||
        item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.responsible.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.equipmentId?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchType = filterType === "todos" || item.type.toLowerCase() === filterType.toLowerCase();
      const matchSector = filterSector === "todos" || item.sector === filterSector;

      return matchSearch && matchType && matchSector;
    });
  }, [searchTerm, filterType, filterSector]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = {
    total: equipmentData.length,
    monitors: equipmentData.filter((i) => i.type === "Monitor").length,
    desktops: equipmentData.filter((i) => i.type === "Desktop").length,
    laptops: equipmentData.filter((i) => i.type === "Laptop").length,
  };

  const sectorOptions = Array.from(new Set(equipmentData.map((i) => i.sector))).sort();

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
              Aqui você encontra todos os equipamentos cadastrados no sistema com informações detalhadas sobre modelos, responsáveis e status de funcionamento.
            </p>
          </div>

          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-6">
              <p className="text-sm font-medium text-slate-600">Total de Equipamentos</p>
              <p className="mt-2 text-3xl font-bold text-gov-heading">{stats.total}</p>
              <p className="mt-1 text-xs text-slate-500">itens no inventário</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6">
              <p className="text-sm font-medium text-slate-600">Monitores</p>
              <p className="mt-2 text-3xl font-bold text-blue-700">{stats.monitors}</p>
              <p className="mt-1 text-xs text-slate-500">{Math.round((stats.monitors / stats.total) * 100)}% do total</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 to-amber-100 p-6">
              <p className="text-sm font-medium text-slate-600">Desktops</p>
              <p className="mt-2 text-3xl font-bold text-amber-700">{stats.desktops}</p>
              <p className="mt-1 text-xs text-slate-500">{Math.round((stats.desktops / stats.total) * 100)}% do total</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-teal-50 to-teal-100 p-6">
              <p className="text-sm font-medium text-slate-600">Laptops</p>
              <p className="mt-2 text-3xl font-bold text-teal-700">{stats.laptops}</p>
              <p className="mt-1 text-xs text-slate-500">{Math.round((stats.laptops / stats.total) * 100)}% do total</p>
            </div>
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Pesquisar
              </label>
              <input
                type="text"
                placeholder="Modelo, responsável, número de série..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tipo de Equipamento
              </label>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              >
                <option value="todos">Todos os tipos</option>
                <option value="monitor">Monitores</option>
                <option value="desktop">Desktops</option>
                <option value="laptop">Laptops</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Setor
              </label>
              <select
                value={filterSector}
                onChange={(e) => {
                  setFilterSector(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              >
                <option value="todos">Todos os setores</option>
                {sectorOptions.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Resultados
              </label>
              <div className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-900">
                {filteredData.length} de {equipmentData.length} {filteredData.length !== 1 ? "itens" : "item"}
              </div>
            </div>
          </div>

          {filteredData.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Modelo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Etiqueta</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Patrimônio</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Número de série</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Responsável</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Setor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">BIOS atualizada?</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item) => {
                      const biosStatus = item.responsible === "Power BI - remoto"
                        ? ""
                        : item.notes === "BIOS"
                          ? item.assetId === "1240574" || item.assetId === "1240651"
                            ? "não precisa"
                            : "feito"
                          : item.notes
                            ? "não precisa"
                            : "";

                      return (
                        <tr key={`${item.id}-${item.assetId}-${item.equipmentId ?? 'noeq'}`} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="px-4 py-3 text-sm text-slate-900">
                            <span className="inline-block rounded-full px-2 py-1 text-xs font-medium bg-slate-100 text-slate-800">
                              {item.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            <p className="font-medium">{item.model}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            <span className="inline-block rounded px-2 py-1 text-xs font-medium bg-slate-100 text-slate-800">
                              {item.assetType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <code className="text-xs bg-slate-100 rounded px-2 py-1">{item.assetId}</code>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            <p className="max-w-xs truncate">{item.equipmentId || '-'}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            <p className="max-w-xs truncate">{item.responsible}</p>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-block rounded px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800">
                              {item.sector}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${biosStatus === "feito" ? "bg-emerald-100 text-emerald-800" : biosStatus === "não precisa" ? "bg-slate-100 text-slate-800" : "text-slate-500"}`}>
                              {biosStatus || ""}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            <div className="text-xs space-y-1">
                              {item.macIp && (
                                <p>
                                  <span className="font-medium">IP:</span> {item.macIp}
                                </p>
                              )}
                              {item.equipmentId && (
                                <p>
                                  <span className="font-medium">Eq:</span> {item.equipmentId}
                                </p>
                              )}
                              {item.notes && item.notes !== "BIOS" && (
                                <p className="text-amber-600 font-medium">
                                  {item.notes}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Anterior
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`h-9 w-9 rounded-lg font-medium text-sm transition ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Próxima
                  </button>

                  <span className="ml-4 text-sm text-slate-600">
                    Página {currentPage} de {totalPages}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-slate-600">Nenhum equipamento encontrado com os filtros selecionados.</p>
              <p className="mt-2 text-sm text-slate-500">Tente ajustar sua pesquisa ou os filtros.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
