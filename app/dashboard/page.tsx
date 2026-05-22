"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { CategoryCard } from "@/components/dashboard/CategoryCard";
import { DocumentFilters } from "@/components/dashboard/DocumentFilters";
import { DocumentCard } from "@/components/dashboard/DocumentCard";
import { DocumentFormModal, DocumentViewerModal } from "@/components/dashboard/DocumentModals";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { useDashboard } from "@/hooks/useDashboard";
import { AREAS, formatarTempo, AREA_CORES, getFileTipo } from "@/lib/dashboard";
import { BackButton } from "@/components/BackButton";
import { VIEWER_PUBLIC_GOV_LINK, VIEWER_PUBLIC_PREVIEW_IMAGE } from "@/lib/storage";

export default function DashboardPage() {
  const router = useRouter();
  const [showLanding, setShowLanding] = useState(true);

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
    setFiltroSensivel,
    setFiltroFonte,
    setShowModal,
    setViewingUrl,
    setDownloadUrl,
    marcarTodasLidas,
  } = useDashboard();

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    const alert = searchParams.get("alert");
    if (alert === "no_permission_inventario") {
      setAlertMessage("Você não tem permissão para acessar a página de inventário.");
      router.replace(pathname);
    }
  }, [searchParams, pathname, router]);

  const navItems = [
    {
      label: "Painéis",
      onClick: () => setShowLanding(false),
      active: !showLanding,
    },
    {
      label: "Sistemas",
      onClick: () => router.push("/sistemas"),
      active: false,
    },
    {
      label: "Inventário",
      onClick: () => router.push("/inventario"),
      active: false,
    },
    ...(isAdmin
      ? [
          {
            label: "Usuários",
            onClick: () => router.push("/dashboard/usuarios"),
            active: false,
          },
          {
            label: "Logs",
            onClick: () => router.push("/dashboard/audit"),
            active: false,
          },
        ]
      : []),
  ];

  if (loading) {
    return (
      <main className="gov-page-bg flex min-h-screen items-center justify-center">
        <p className="text-gov-muted">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="gov-page-bg min-h-screen">
      <nav className="gov-header px-6 py-4 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.65)] bg-gradient-to-r from-slate-950 via-slate-900/95 to-slate-950 border-b border-slate-800/20">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowLanding(true)}
            className="flex items-center gap-4 rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
            aria-label="Ir para o Dashboard"
          >
            <Logo className="h-10 w-auto hover-scale" width={40} height={40} alt="Data Control" />
            <div>
              <h1 className="text-lg font-semibold text-white">Data Control</h1>
              <p className="text-xs text-white/80">Portal de Gestão de Documentos</p>
            </div>
          </button>

          <div className="flex flex-wrap items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                <span className="text-sm text-white/90">{displayName || user?.email}</span>
                <span className="gov-badge rounded-full bg-white/15 text-white">
                  {roleLabel[role]}
                </span>
              </div>
            ) : null}

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

            {!showLanding && canEdit && (
              <button
                type="button"
                onClick={openCreate}
                className="gov-button text-sm px-4 py-2 rounded-2xl font-medium bg-slate-900 shadow-lg shadow-slate-950/20 hover:bg-slate-800 hover:-translate-y-0.5"
              >
                + Novo Painel
              </button>
            )}

            {showLanding && (
              <button
                type="button"
                onClick={() => router.push(user ? "/dashboard/profile" : "/login")}
                className="gov-button-secondary-dark rounded-2xl px-4 py-2 text-sm font-medium bg-white/10 shadow-lg shadow-slate-950/10 hover:bg-white/15"
              >
                {user ? "Meu Perfil" : "Login"}
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {alertMessage && (
          <div className="gov-status-error mb-6 rounded-xl border-l-4 p-4">
            <p className="text-sm font-medium">{alertMessage}</p>
          </div>
        )}
        {showLanding ? (
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="gov-card rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.18)]">
                <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-gov-muted">Menu</p>
                </div>
              </div>

              <nav className="mt-6 space-y-3">
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${item.active ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </aside>

            <section className="space-y-8">
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.18)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="max-w-2xl">
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-gov-muted">
                      Painel principal
                    </p>
                    <h1 className="mt-3 text-3xl font-bold text-gov-heading">
                      Bem-vindo ao Data Control
                    </h1>
                    <p className="mt-3 text-base leading-7 text-slate-600">
                      Acesse seus painéis, sistemas e inventário com um clique.
                    </p>
                  </div>

                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setShowLanding(false)}
                  className="group rounded-[2rem] border border-slate-200/80 bg-white p-8 text-left shadow-[0_20px_50px_-30px_rgba(15,23,42,0.18)] transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gov-muted">
                    Painéis
                  </p>
                  <h2 className="mt-4 text-2xl font-bold text-gov-heading">Acessar painéis</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Veja o catálogo de painéis e acompanhe as áreas cadastradas no sistema.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/sistemas")}
                  className="group rounded-[2rem] border border-slate-200/80 bg-white p-8 text-left shadow-[0_20px_50px_-30px_rgba(15,23,42,0.18)] transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gov-muted">
                    Sistemas
                  </p>
                  <h2 className="mt-4 text-2xl font-bold text-gov-heading">Ir para sistemas</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Consulte as plataformas e ferramentas disponíveis em uso pela equipe.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/inventario")}
                  className="group rounded-[2rem] border border-slate-200/80 bg-white p-8 text-left shadow-[0_20px_50px_-30px_rgba(15,23,42,0.18)] transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gov-muted">
                    Inventário
                  </p>
                  <h2 className="mt-4 text-2xl font-bold text-gov-heading">Página de inventário</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Acesse o inventário de ativos e registros para visão integrada da infraestrutura.
                  </p>
                </button>
              </div>
            </section>
          </div>
        ) : (
          <>
            {error && (
              <div className="gov-status-error mb-4 rounded-xl p-4 text-sm">
                {error}
              </div>
            )}

            {view === "categorias" ? (
              <>
                <div className="mb-8">
                  <h1 className="gov-section-title text-3xl font-bold mb-2">Catálogo de Painéis</h1>
                  <p className="text-lg text-gov-muted">
                    {AREAS.length} áreas disponíveis · {totalDocumentos} painéis cadastrados
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                  <BackButton onClick={voltarCategorias} label="Voltar às áreas" className="gov-button-ghost mb-2 text-xs font-medium" />
                  <h1 className="gov-section-title text-xl font-medium">{areaAtiva}</h1>
                  <p className="text-sm text-gov-muted">
                    {documentosFiltrados.length} painel{documentosFiltrados.length !== 1 ? "s" : ""}
                    {temFiltroAtivo ? " encontrado" + (documentosFiltrados.length !== 1 ? "s" : "") : " nesta área"}
                  </p>
                </div>

                <DocumentFilters
                  busca={busca}
                  setBusca={setBusca}
                  filtroSensivel={filtroSensivel}
                  setFiltroSensivel={setFiltroSensivel}
                  filtroFonte={filtroFonte}
                  setFiltroFonte={setFiltroFonte}
                  temFiltroAtivo={temFiltroAtivo}
                  onClear={() => {
                    setBusca("");
                    setFiltroSensivel("");
                    setFiltroFonte(true);
                  }}
                />

                {documentosFiltrados.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                  <div className="gov-card rounded-xl border bg-white p-12 text-center">
                    <p className="text-sm text-gov-muted">
                      {temFiltroAtivo ? "Nenhum painel encontrado com os filtros aplicados." : "Nenhum painel cadastrado nesta área."}
                    </p>
                    {canEdit && !temFiltroAtivo && (
                      <button
                        type="button"
                        onClick={openCreate}
                        className="gov-button mt-4"
                      >
                        + Adicionar painel
                      </button>
                    )}
                    {temFiltroAtivo && (
                      <button
                        type="button"
                        onClick={() => {
                          setBusca("");
                          setFiltroSensivel("");
                          setFiltroFonte(true);
                        }}
                        className="gov-button-secondary mt-4"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                )}
              </>
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
