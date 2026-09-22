"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
// BackButton provided by PageHeader via `backHref`
import PageHeader from "@/components/PageHeader";
import { useSistemas } from "@/hooks/useSistemas";
import { SistemasModal } from "@/components/sistemas/SistemasModals";
import { SistemasFilters } from "@/components/sistemas/SistemasFilters";
import { COLORS, ROLE_LABELS } from "@/lib/ui-constants";

export default function SistemasPage() {
  const router = useRouter();

  const {
    user,
    role,
    displayName,
    sistemas,
    loading,
    error,
    showModal,
    editingId,
    form,
    saving,
    formError,
    canEdit,
    canDelete,
    isAdmin,
    busca,
    setBusca,
    filtroAmbiente,
    setFiltroAmbiente,
    filtroHomologados,
    setFiltroHomologados,
    filtroAcessiveis,
    setFiltroAcessiveis,
    filtroTipoAcesso,
    setFiltroTipoAcesso,
    filtroSecretaria,
    setFiltroSecretaria,
    temFiltroAtivo,
    clearFilters,
    handleEdit,
    handleSave,
    handleDelete,
    openNewModal,
    closeModal,
    setForm,
    handleCreate,
  } = useSistemas();

  const handleSubmit = editingId ? handleSave : handleCreate;
  let emptyStateMessage = "Aguarde o cadastro de sistemas";
  if (temFiltroAtivo) {
    emptyStateMessage = "Tente ajustar os filtros";
  } else if (canEdit) {
    emptyStateMessage = "Comece adicionando um novo sistema clicando no botão acima";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="gov-page-bg min-h-screen">
      <nav className="gov-header px-6 py-4 shadow-soft">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-4 rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
            aria-label="Ir para o Dashboard"
          >
            <Logo className="h-10 w-auto hover-scale" width={40} height={40} alt="Horús" />
            <div>
              <h1 className="text-lg font-semibold text-white">Horús</h1>
              <p className="text-xs text-white/70">Portal de Gestão de Documentos</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {/* user display removed to avoid duplication; profile accessible via the right-side user badge */}

            {canEdit && (
              <button
                type="button"
                onClick={openNewModal}
                className="gov-button inline-flex items-center gap-3 rounded-full px-4 py-1.5 text-sm font-medium"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                Novo Sistema
              </button>
            )}

            {user ? (
              <button
                type="button"
                onClick={() => router.push("/dashboard/profile")}
                className="gov-button-secondary-dark inline-flex items-center gap-3 rounded-full px-4 py-1.5 text-sm font-medium"
                aria-label={displayName || "Usuário"}
                title={displayName || "Usuário"}
              >
                <span className="text-sm text-white/95 truncate max-w-[160px]">{displayName || "Usuário"}</span>
                <span className={`gov-badge role-${role}`}>{ROLE_LABELS?.[role] ?? role}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="gov-button-secondary-dark inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {error && (
          <p className="mb-4 rounded-lg border p-3 text-sm border-red-200 bg-red-50 text-red-600">{error}</p>
        )}

        <PageHeader title={<h1 className="text-3xl font-bold" style={{ color: COLORS.primary }}>Sistemas</h1>} subtitle={"Catálogo de plataformas e sistemas disponíveis"} backHref="/dashboard" />

        {/* Filtros */}
        <SistemasFilters
          busca={busca}
          setBusca={setBusca}
          filtroAmbiente={filtroAmbiente}
          setFiltroAmbiente={setFiltroAmbiente}
          filtroHomologados={filtroHomologados}
          setFiltroHomologados={setFiltroHomologados}
          filtroAcessiveis={filtroAcessiveis}
          setFiltroAcessiveis={setFiltroAcessiveis}
          filtroTipoAcesso={filtroTipoAcesso}
          setFiltroTipoAcesso={setFiltroTipoAcesso}
          filtroSecretaria={filtroSecretaria}
          setFiltroSecretaria={setFiltroSecretaria}
          temFiltroAtivo={temFiltroAtivo}
          onClear={clearFilters}
          mostrarHomologadosProducao
        />

        {sistemas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 font-medium mb-2">Nenhum sistema encontrado</p>
            <p className="text-sm text-slate-500">{emptyStateMessage}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-soft">
            <div className="min-w-0">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-[12%]" />
                  <col className="w-[28%]" />
                  {isAdmin && <col className="w-[24%]" />}
                  <col className="w-[12%]" />
                  <col className={isAdmin ? "w-[24%]" : "w-[48%]"} />
                </colgroup>
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Sigla
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Nome
                    </th>
                    {isAdmin && (
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Gestores
                      </th>
                    )}
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Acesso
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sistemas.map((sistema) => (
                    <tr key={sistema.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-4 align-top sm:px-6">
                        <div className="inline-flex max-w-full items-center truncate rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          {sistema.sigla}
                        </div>
                      </td>
                      <td className="px-3 py-4 align-top sm:px-6">
                        <div className="truncate text-sm font-medium text-slate-900" title={sistema.nome}>
                          {sistema.nome}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-4 align-top sm:px-6">
                          <div className="truncate text-sm text-slate-600" title={sistema.gestores || undefined}>
                            {sistema.gestores || "-"}
                          </div>
                        </td>
                      )}
                      <td className="px-3 py-4 align-top sm:px-6">
                        {(() => {
                          const acesso = sistema.tipo_acesso?.toLowerCase();
                          const isRestrito = acesso === "restrito";
                          return (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isRestrito ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                            }`}>
                              {isRestrito ? "Restrito" : "Público"}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="min-w-0 px-3 py-4 align-top text-sm font-medium sm:px-6">
                        <div className="flex min-w-0 flex-nowrap items-center gap-x-2 overflow-hidden whitespace-nowrap">
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEdit(sistema)}
                                className="shrink-0 text-left font-medium text-amber-600 transition-colors hover:text-amber-900"
                              >
                                Editar
                              </button>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(sistema.id!)}
                                  className="shrink-0 text-left font-medium text-red-600 transition-colors hover:text-red-900"
                                >
                                  Excluir
                                </button>
                              )}
                            </>
                          )}
                          {sistema.url_producao && (
                            <a
                              href={sistema.url_producao}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 text-blue-600 transition-colors hover:text-blue-900"
                            >
                              Produção
                            </a>
                          )}
                          {sistema.url_homologacao && (
                            <a
                              href={sistema.url_homologacao}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 text-blue-600 transition-colors hover:text-blue-900"
                            >
                              Homologação
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Mostrando {sistemas.length} sistema{sistemas.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}
      </div>

      <SistemasModal
        isOpen={showModal}
        form={form}
        formError={formError}
        saving={saving}
        editingId={editingId}
        onSubmit={handleSubmit}
        onCancel={closeModal}
        setForm={setForm}
      />
    </main>
  );
}
