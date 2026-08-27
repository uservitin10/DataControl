"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { CategoryCard } from "@/components/dashboard/CategoryCard";
import { DocumentFilters } from "@/components/dashboard/DocumentFilters";
import { DocumentCard } from "@/components/dashboard/DocumentCard";
import { DocumentFormModal, DocumentViewerModal } from "@/components/dashboard/DocumentModals";
import { useDashboard } from "@/hooks/useDashboard";
import { AREAS, AREA_CORES, getFileTipo } from "@/lib/dashboard";
// BackButton usage moved to PageHeader where appropriate
import PageHeader from "@/components/PageHeader";
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
    isAdmin,
    
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
  } = useDashboard();

  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
    const alert = url?.searchParams.get("alert");
    if (alert === "no_permission_inventario") {
      const path = url?.pathname ?? "/dashboard";
      setTimeout(() => {
        setAlertMessage("Você não tem permissão para acessar o inventário geral.");
        router.replace(path);
      }, 0);
    }
  }, [router]);

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
    {
      label: "Levantamento",
      onClick: () => router.push("/levantamento"),
      active: false,
    },
    ...(isAdmin
      ? [
          {
            label: "Notificações",
            onClick: () => router.push("/dashboard/notificacoes"),
            active: false,
          },
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
            <Logo className="h-10 w-auto hover-scale" width={40} height={40} alt="Horús" />
            <div>
              <h1 className="text-lg font-semibold text-white">Horús</h1>
              <p className="text-xs text-white/80">Portal de Gestão de Documentos</p>
            </div>
          </button>

          <div className="flex flex-wrap items-center gap-3">
            {!showLanding && canEdit && (
              <button
                type="button"
                onClick={openCreate}
                className="gov-button inline-flex items-center gap-3 rounded-full px-4 py-1.5 text-sm font-medium"
              >
                + Novo Painel
              </button>
            )}

            {user ? (
              <button
                type="button"
                onClick={() => router.push("/dashboard/profile")}
                className="gov-button-secondary-dark inline-flex items-center gap-3 rounded-full px-4 py-1.5 text-sm font-medium"
                aria-label={displayName || user?.email || "Usuário"}
                title={displayName || user?.email || "Usuário"}
              >
                <span className="text-sm text-white/95 truncate max-w-[160px]">{displayName || user?.email || "Usuário"}</span>
                <span className="gov-badge">{roleLabel[role]}</span>
              </button>
            ) : null}

            {showLanding && !user && (
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="gov-button-secondary-dark inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
              >
                Login
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
                      Bem-vindo ao Horús
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

                {user && (
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/meu-inventario")}
                    className="group rounded-[2rem] border border-slate-200/80 bg-white p-8 text-left shadow-[0_20px_50px_-30px_rgba(15,23,42,0.18)] transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gov-muted">
                      Meu Inventário
                    </p>
                    <h2 className="mt-4 text-2xl font-bold text-gov-heading">Meus equipamentos</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Veja os equipamentos e licenças alocados para você.
                    </p>
                  </button>
                )}

                {user && (
                  <button
                    type="button"
                    onClick={() => router.push("/reclame-aqui")}
                    className="group rounded-[2rem] border border-slate-200/80 bg-white p-8 text-left shadow-[0_20px_50px_-30px_rgba(15,23,42,0.18)] transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gov-muted">
                      Sugestões
                    </p>
                    <h2 className="mt-4 text-2xl font-bold text-gov-heading">Sugestões</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Envie sua sugestão diretamente ao time responsável.
                    </p>
                  </button>
                )}

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
                <PageHeader
                  title={<h1 className="gov-section-title text-3xl font-bold">Catálogo de Painéis</h1>}
                  subtitle={<p className="text-lg text-gov-muted">{AREAS.length} áreas disponíveis · {totalDocumentos} painéis cadastrados</p>}
                  backOnClick={() => setShowLanding(true)}
                  backLabel="Voltar"
                />

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
                  <PageHeader title={<h1 className="gov-section-title text-xl font-medium">{areaAtiva}</h1>} subtitle={<p className="text-sm text-gov-muted">{documentosFiltrados.length} painel{documentosFiltrados.length !== 1 ? "s" : ""}{temFiltroAtivo ? " encontrado" + (documentosFiltrados.length !== 1 ? "s" : "") : " nesta área"}</p>} backOnClick={voltarCategorias} backLabel="Voltar às áreas" />
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
