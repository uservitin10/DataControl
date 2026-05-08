"use client";

import { useRouter } from "next/navigation";
import { Logo } from "@/src/components/Logo";
import { CategoryCard } from "@/src/components/dashboard/CategoryCard";
import { DocumentFilters } from "@/src/components/dashboard/DocumentFilters";
import { DocumentCard } from "@/src/components/dashboard/DocumentCard";
import { DocumentFormModal, DocumentViewerModal } from "@/src/components/dashboard/DocumentModals";
import { NotificationsDropdown } from "@/src/components/dashboard/NotificationsDropdown";
import { useDashboard } from "@/src/hooks/useDashboard";
import { AREAS, formatarTempo, AREA_CORES, getFileTipo } from "@/src/lib/dashboard";
import { VIEWER_PUBLIC_GOV_LINK, VIEWER_PUBLIC_PREVIEW_IMAGE } from "@/src/lib/storage";

export default function DashboardPage() {
  const router = useRouter();

  const {
    user,
    role,
    displayName,
    registros,
    loading,
    error,
    view,
    areaAtiva,
    showModal,
    editingId,
    form,
    arquivo,
    preview,
    saving,
    formError,
    viewingUrl,
    viewingNome,
    downloadUrl,
    busca,
    filtroAcesso,
    filtroSensivel,
    filtroFonte,
    notificacoes,
    showNotif,
    setShowNotif,
    notifRef,
    isAdmin,
    isEditor,
    isViewer,
    canEdit,
    canDelete,
    roleLabel,
    documentosFiltrados,
    totalDocumentos,
    temFiltroAtivo,
    abrirCategoria,
    voltarCategorias,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
    handleVisualizarArquivo,
    getPreviewUrl,
    setForm,
    setArquivo,
    setPreview,
    setBusca,
    setFiltroAcesso,
    setFiltroSensivel,
    setFiltroFonte,
    setShowModal,
    setViewingUrl,
    setDownloadUrl,
    marcarTodasLidas,
  } = useDashboard();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
        <p style={{ color: "#64748b" }}>Carregando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      <nav className="px-6 py-4 shadow-soft" style={{ background: "linear-gradient(135deg, #1a2744 0%, #2d3a5c 100%)" }}>
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
              <span className="text-sm text-white/90">{displayName || user?.email}</span>
              <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-white/20 text-white">
                {roleLabel[role]}
              </span>
            </div>

            {isAdmin && (
              <NotificationsDropdown
                notificacoes={notificacoes}
                showNotif={showNotif}
                onToggle={() => {
                  setShowNotif((v) => !v);
                  if (!showNotif) {
                    void marcarTodasLidas();
                  }
                }}
                onMarkAllRead={marcarTodasLidas}
                formatarTempo={formatarTempo}
                containerRef={notifRef}
              />
            )}

            {canEdit && (
              <button
                type="button"
                onClick={openCreate}
                className="btn-primary text-sm px-4 py-2 rounded-lg font-medium hover-lift"
              >
                + Novo Painel
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

        {view === "categorias" ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2" style={{ color: "#1a2744" }}>Catálogo de Painéis</h1>
              <p className="text-lg text-slate-600">
                {AREAS.length} áreas disponíveis · {totalDocumentos} painéis cadastrados
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {AREAS.map((cat) => {
                const count = registros.filter((r) => r.categoria === cat).length;
                const color = AREA_CORES[cat] ?? { bg: "#e8edf5", text: "#1a2744" };
                return (
                  <CategoryCard
                    key={cat}
                    categoria={cat}
                    count={count}
                    color={color}
                    onClick={() => abrirCategoria(cat)}
                  />
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <button
                type="button"
                onClick={voltarCategorias}
                className="mb-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:opacity-70"
              >
                ← Voltar às áreas
              </button>
              <h1 className="text-xl font-medium" style={{ color: "#1a2744" }}>{areaAtiva}</h1>
              <p className="text-sm" style={{ color: "#64748b" }}>
                {documentosFiltrados.length} painel{documentosFiltrados.length !== 1 ? "s" : ""}
                {temFiltroAtivo ? " encontrado" + (documentosFiltrados.length !== 1 ? "s" : "") : " nesta área"}
              </p>
            </div>

            <DocumentFilters
              busca={busca}
              setBusca={setBusca}
              filtroAcesso={filtroAcesso}
              setFiltroAcesso={setFiltroAcesso}
              filtroSensivel={filtroSensivel}
              setFiltroSensivel={setFiltroSensivel}
              filtroFonte={filtroFonte}
              setFiltroFonte={setFiltroFonte}
              temFiltroAtivo={temFiltroAtivo}
              onClear={() => {
                setBusca("");
                setFiltroAcesso("");
                setFiltroSensivel("");
                setFiltroFonte(true);
              }}
            />

            {documentosFiltrados.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documentosFiltrados.map((registro) => (
                  <DocumentCard
                    key={registro.id}
                    registro={registro}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    color={AREA_CORES[registro.categoria] ?? { bg: "#e8edf5", text: "#1a2744" }}
                    getPreviewUrl={getPreviewUrl}
                    getFileTipo={getFileTipo}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onVisualizarArquivo={handleVisualizarArquivo}
                    isViewer={isViewer}
                    viewerPublicLink={VIEWER_PUBLIC_GOV_LINK}
                    viewerPreviewImage={VIEWER_PUBLIC_PREVIEW_IMAGE}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border bg-white p-12 text-center" style={{ borderColor: "#e2e8f0" }}>
                <p className="text-sm text-slate-400">
                  {temFiltroAtivo ? "Nenhum painel encontrado com os filtros aplicados." : "Nenhum painel cadastrado nesta área."}
                </p>
                {canEdit && !temFiltroAtivo && (
                  <button
                    type="button"
                    onClick={openCreate}
                    className="mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white"
                    style={{ backgroundColor: "#2563eb" }}
                  >
                    + Adicionar painel
                  </button>
                )}
                {temFiltroAtivo && (
                  <button
                    type="button"
                    onClick={() => {
                      setBusca("");
                      setFiltroAcesso("");
                      setFiltroSensivel("");
                    }}
                    className="mt-4 text-sm font-medium text-blue-600 hover:underline"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <DocumentFormModal
          editingId={editingId}
          form={form}
          setForm={setForm}
          setArquivo={setArquivo}
          setPreview={setPreview}
          arquivoFileName={arquivo?.name}
          previewFileName={preview?.name}
          formError={formError}
          saving={saving}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      {viewingUrl && (
        <DocumentViewerModal
          viewingUrl={viewingUrl}
          downloadUrl={downloadUrl}
          viewingNome={viewingNome}
          onClose={() => {
            setViewingUrl(null);
            setDownloadUrl(null);
          }}
        />
      )}
    </main>
  );
}