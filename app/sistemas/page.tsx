"use client";

import { useRouter } from "next/navigation";
import { Logo } from "@/src/components/Logo";
import { useSistemas } from "@/src/hooks/useSistemas";
import { SistemasCard } from "@/src/components/sistemas/SistemasCard";
import { SistemasModal } from "@/src/components/sistemas/SistemasModals";
import { SistemasFilters } from "@/src/components/sistemas/SistemasFilters";
import { COLORS, ROLE_LABELS } from "@/src/lib/ui-constants";

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
    setError,
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
    <main className="min-h-screen" style={{ backgroundColor: COLORS.background }}>
      <nav className="px-6 py-4 shadow-soft" style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)` }}>
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Logo className="h-10 w-auto hover-scale" width={40} height={40} alt="Data Control" />
            <div>
              <h1 className="text-lg font-semibold text-white">Data Control</h1>
              <p className="text-xs text-white/70">Portal de Gestão de Documentos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
              <span className="text-sm text-white/90">{displayName || "Usuário"}</span>
              <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-white/20 text-white">
                {ROLE_LABELS[role]}
              </span>
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              Painéis
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={openNewModal}
                className="btn-primary text-sm px-4 py-2 rounded-lg font-medium hover-lift"
                style={{ backgroundColor: COLORS.success }}
              >
                + Novo Sistema
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => router.push("/dashboard/usuarios")}
                className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                Usuários
              </button>
            )}

            <button
              type="button"
              onClick={() => router.push("/dashboard/profile")}
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sistemas.map((sistema) => (
              <SistemasCard
                key={sistema.id}
                sistema={sistema}
                canEdit={canEdit}
                canDelete={canDelete}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
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
