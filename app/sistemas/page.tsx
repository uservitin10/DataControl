"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
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
            <Logo className="h-10 w-auto hover-scale" width={40} height={40} alt="Data Control" />
            <div>
              <h1 className="text-lg font-semibold text-white">Data Control</h1>
              <p className="text-xs text-white/70">Portal de Gestão de Documentos</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
                <span className="text-sm text-white/90">{displayName || "Usuário"}</span>
                <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-white/20 text-white">
                  {ROLE_LABELS[role]}
                </span>
              </div>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={openNewModal}
                className="gov-button text-sm px-4 py-2 rounded-lg font-medium hover-lift inline-flex items-center gap-2"
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

            {/* Usuários button removed per request */}

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

      <div className="mx-auto max-w-6xl px-6 py-8">
        {error && (
          <p className="mb-4 rounded-lg border p-3 text-sm border-red-200 bg-red-50 text-red-600">{error}</p>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: COLORS.primary }}>
            Sistemas
          </h1>
          <p className="mt-2 text-slate-600">
            Catálogo de plataformas e sistemas disponíveis
          </p>
        </div>

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
          mostrarHomologadosProducao={role === "viewer" || !user || !canEdit}
        />

        {sistemas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 font-medium mb-2">Nenhum sistema encontrado</p>
            <p className="text-sm text-slate-500">
              {temFiltroAtivo
                ? "Tente ajustar os filtros"
                : canEdit
                ? "Comece adicionando um novo sistema clicando no botão acima"
                : "Aguarde o cadastro de sistemas"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {sistema.sigla}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {sistema.nome}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-600">
                            {sistema.gestores || "-"}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-wrap items-center gap-2">
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEdit(sistema)}
                                className="text-amber-600 hover:text-amber-900 transition-colors font-medium"
                              >
                                Editar
                              </button>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(sistema.id!)}
                                  className="text-red-600 hover:text-red-900 transition-colors font-medium"
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
                              className="text-blue-600 hover:text-blue-900 transition-colors font-medium"
                            >
                              Produção
                            </a>
                          )}
                          {sistema.url_homologacao && (
                            <a
                              href={sistema.url_homologacao}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:text-blue-900 transition-colors font-medium"
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
