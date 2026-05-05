"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";
import { Logo } from "@/src/components/Logo";
import { CategoryCard } from "@/src/components/dashboard/CategoryCard";
import { DocumentFilters } from "@/src/components/dashboard/DocumentFilters";
import { DocumentCard } from "@/src/components/dashboard/DocumentCard";
import { DocumentFormModal, DocumentViewerModal } from "@/src/components/dashboard/DocumentModals";
import { NotificationsDropdown } from "@/src/components/dashboard/NotificationsDropdown";
import { useAudit } from "@/src/hooks/useAudit";
import type { DashboardForm, Notificacao, Registro, Role, View } from "@/src/types/dashboard";
import { EMPTY_FORM, AREAS, formatarTempo, AREA_CORES, getFileTipo } from "@/src/lib/dashboard";

type DashboardFormState = DashboardForm;

export default function DashboardPage() {
  const router = useRouter();
  const { logAction } = useAudit();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>("viewer");
  const [displayName, setDisplayName] = useState("");
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("categorias");
  const [areaAtiva, setAreaAtiva] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DashboardFormState>(EMPTY_FORM);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const [viewingNome, setViewingNome] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroAcesso, setFiltroAcesso] = useState("");
  const [filtroSensivel, setFiltroSensivel] = useState("");
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const isAdmin = role === "admin";

  const fetchRegistros = useCallback(async () => {
    const res = await fetch("/api/registros", { cache: "no-store" });
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      setError(errorData?.error || "Erro ao carregar registros.");
      return;
    }

    const data = (await res.json()) as Registro[];
    setRegistros(data ?? []);
  }, []);

  const fetchNotificacoes = useCallback(async () => {
    if (!isAdmin) {
      setNotificacoes([]);
      return;
    }

    const res = await fetch("/api/notificacoes", { cache: "no-store" });
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      setError(errorData?.error || "Erro ao carregar notificações.");
      return;
    }

    const data = (await res.json()) as Notificacao[];
    setNotificacoes(data ?? []);
  }, [isAdmin]);

  const criarNotificacao = useCallback(async (tipo: string, mensagem: string) => {
    const res = await fetch("/api/notificacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, mensagem, lida: false }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      console.error("Erro ao criar notificação:", errorData?.error || "Erro desconhecido");
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user ?? null;

      if (!sessionUser) {
        router.replace("/login");
        return;
      }

      setUser(sessionUser);

      // Log de auditoria - login
      await logAction("login", "user", sessionUser.id, {
        email: sessionUser.email,
        timestamp: new Date().toISOString()
      });

      const profileRes = await fetch(`/api/profile?id=${encodeURIComponent(sessionUser.id)}`, {
        cache: "no-store",
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData?.role) setRole(profileData.role as Role);
        if (profileData?.display_name) setDisplayName(profileData.display_name);
      }

      await fetchRegistros();
      await fetchNotificacoes();
      setLoading(false);
    };

    void loadData();
  }, [router, fetchRegistros, fetchNotificacoes]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const marcarTodasLidas = async () => {
    const res = await fetch("/api/notificacoes", { method: "PATCH" });
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      console.error(errorData?.error || "Erro ao marcar notificações lidas.");
    }
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
  };

  const uploadFileToStorage = async (bucket: string, path: string, file: File) => {
    const formData = new FormData();
    formData.append("bucket", bucket);
    formData.append("path", path);
    formData.append("file", file);

    const res = await fetch("/api/storage", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      setFormError(errorData?.error || "Erro no upload do arquivo.");
      return false;
    }

    return true;
  };

  const deleteStorageFile = async (bucket: string, path: string) => {
    const res = await fetch("/api/storage", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket, path }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      console.error(errorData?.error || "Erro ao excluir arquivo no storage.");
      return false;
    }

    return true;
  };

  const fetchSignedUrl = async (bucket: string, path: string, expires = 3600) => {
    const res = await fetch(`/api/storage?type=signed&bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}&expires=${expires}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      setError(errorData?.error || "Não foi possível gerar o link de visualização.");
      return null;
    }

    const data = await res.json();
    return data.signedUrl as string | null;
  };

  const isEditor = role === "editor";
  const canEdit = isAdmin || isEditor;
  const canDelete = isAdmin;

  const abrirCategoria = (area: string) => {
    setAreaAtiva(area);
    setBusca("");
    setFiltroAcesso("");
    setFiltroSensivel("");
    setView("documentos");
  };

  const voltarCategorias = () => {
    setView("categorias");
    setAreaAtiva("");
    setBusca("");
    setFiltroAcesso("");
    setFiltroSensivel("");
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, categoria: areaAtiva || AREAS[0] });
    setArquivo(null);
    setPreview(null);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (registro: Registro) => {
    setEditingId(registro.id ?? null);
    setForm({
      nome: registro.nome,
      categoria: registro.categoria,
      link: registro.link ?? "",
      descricao: registro.descricao,
      tipo_acesso: registro.tipo_acesso ?? "publico",
      responsavel: registro.responsavel ?? "",
      desenvolvedor: registro.desenvolvedor ?? "",
      fonte_dados: registro.fonte_dados ?? "",
      dados_sensiveis: registro.dados_sensiveis ?? false,
      secretaria: registro.secretaria ?? "",
    });
    setArquivo(null);
    setPreview(null);
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      setFormError("O nome é obrigatório.");
      return;
    }

    setSaving(true);
    setFormError("");

    let arquivo_path: string | undefined;
    let preview_path: string | undefined;

    if (arquivo) {
      const ext = arquivo.name.split(".").pop();
      const nomeSeguro = form.nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_]/g, "_");
      const path = `${Date.now()}_${nomeSeguro}.${ext}`;
      const uploaded = await uploadFileToStorage("documentos", path, arquivo);
      if (!uploaded) {
        setSaving(false);
        return;
      }
      arquivo_path = path;

      // Log de auditoria - upload de documento
      await logAction("upload_file", "storage", undefined, {
        bucket: "documentos",
        path,
        file_name: arquivo.name,
        file_size: arquivo.size,
        file_type: arquivo.type
      });
    }

    if (preview) {
      const ext = preview.name.split(".").pop();
      const nomeSeguro = form.nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_]/g, "_");
      const path = `${Date.now()}_${nomeSeguro}_preview.${ext}`;
      const uploaded = await uploadFileToStorage("previews", path, preview);
      if (!uploaded) {
        setSaving(false);
        return;
      }
      preview_path = path;

      // Log de auditoria - upload de preview
      await logAction("upload_file", "storage", undefined, {
        bucket: "previews",
        path,
        file_name: preview.name,
        file_size: preview.size,
        file_type: preview.type
      });
    }

    const autor = displayName || user?.email || "Alguém";

    if (editingId) {
      const updateData: Partial<Registro> = { ...form, updated_at: new Date().toISOString() };
      if (arquivo_path) updateData.arquivo_path = arquivo_path;
      if (preview_path) updateData.preview_path = preview_path;

      const res = await fetch(`/api/registros/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        setFormError(errorData?.error || "Erro ao atualizar o painel.");
        setSaving(false);
        return;
      }

      await criarNotificacao("edicao", `${autor} editou "${form.nome}" em ${form.categoria}`);

      // Log de auditoria - atualização
      await logAction("update_document", "registro", editingId, {
        nome: form.nome,
        categoria: form.categoria,
        arquivo_path,
        preview_path,
        autor
      });
    } else {
      const payload = {
        ...form,
        arquivo_path,
        preview_path,
        criado_por: user?.id,
      };

      const res = await fetch("/api/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        setFormError(errorData?.error || "Erro ao cadastrar o painel.");
        setSaving(false);
        return;
      }

      await criarNotificacao("cadastro", `${autor} cadastrou "${form.nome}" em ${form.categoria}`);

      // Log de auditoria - criação
      await logAction("create_document", "registro", undefined, {
        nome: form.nome,
        categoria: form.categoria,
        arquivo_path,
        preview_path,
        autor
      });
    }

    await fetchRegistros();
    await fetchNotificacoes();
    setSaving(false);
    setShowModal(false);
  };

  const handleDelete = async (id: string, arquivoPath?: string, previewPath?: string, nome?: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;
    if (arquivoPath) await deleteStorageFile("documentos", arquivoPath);
    if (previewPath) await deleteStorageFile("previews", previewPath);

    const res = await fetch(`/api/registros/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      setError(errorData?.error || "Erro ao excluir o painel.");
      return;
    }

    const autor = displayName || user?.email || "Alguém";
    await criarNotificacao("exclusao", `${autor} excluiu "${nome ?? "um painel"}"`);

    // Log de auditoria - exclusão
    await logAction("delete_document", "registro", id, {
      nome: nome || "Documento sem nome",
      arquivo_path: arquivoPath,
      preview_path: previewPath,
      autor
    });

    await fetchNotificacoes();
    setRegistros((current) => current.filter((r) => r.id !== id));
  };

  const handleVisualizarArquivo = async (arquivoPath: string, nome: string) => {
    const ext = arquivoPath.split(".").pop()?.toLowerCase();
    const fileUrl = await fetchSignedUrl("documentos", arquivoPath, 3600);
    if (!fileUrl) {
      return;
    }

    setDownloadUrl(fileUrl);
    setViewingNome(nome);

    // Log de auditoria - visualização de arquivo
    await logAction("view_document", "storage", undefined, {
      arquivo_path: arquivoPath,
      nome,
      file_type: ext,
      user_id: user?.id
    });

    if (ext === "pbix") {
      window.open(fileUrl, "_blank");
      return;
    }

    if (["xlsx", "xls", "docx", "doc", "pptx", "ppt"].includes(ext ?? "")) {
      setViewingUrl(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`);
      return;
    }

    setViewingUrl(fileUrl);
  };

  const getPreviewUrl = async (previewPath?: string) => {
    if (!previewPath) return null;
    const res = await fetch(`/api/storage?type=public&bucket=previews&path=${encodeURIComponent(previewPath)}`);
    if (!res.ok) {
      console.error("Erro ao obter URL pública da preview.");
      return null;
    }
    const data = await res.json();
    return data.publicUrl as string | null;
  };

  const roleLabel: Record<Role, string> = {
    admin: "Admin",
    editor: "Desenvolvedor",
    viewer: "Viewer",
  };

  const documentosFiltrados = useMemo(() => {
    return registros
      .filter((r) => r.categoria === areaAtiva)
      .filter((r) =>
        !busca || r.nome.toLowerCase().includes(busca.toLowerCase()) || r.descricao?.toLowerCase().includes(busca.toLowerCase())
      )
      .filter((r) => !filtroAcesso || r.tipo_acesso === filtroAcesso)
      .filter((r) =>
        filtroSensivel === "" ? true : filtroSensivel === "sim" ? r.dados_sensiveis : !r.dados_sensiveis
      );
  }, [registros, areaAtiva, busca, filtroAcesso, filtroSensivel]);

  const totalDocumentos = registros.length;
  const temFiltroAtivo = Boolean(busca || filtroAcesso || filtroSensivel);

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
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo className="h-10 w-auto hover-scale" width={40} height={40} alt="Data Control" />
            <div>
              <h1 className="text-lg font-semibold text-white">Data Control</h1>
              <p className="text-xs text-white/70">Portal de Gestão de Documentos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
              <span className="text-sm text-white/90">
                {displayName || user?.email}
              </span>
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
                  if (!showNotif) marcarTodasLidas();
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

            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              Sair
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
              temFiltroAtivo={temFiltroAtivo}
              onClear={() => {
                setBusca("");
                setFiltroAcesso("");
                setFiltroSensivel("");
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
