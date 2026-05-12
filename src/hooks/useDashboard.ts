import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";
import { fetchJson } from "@/src/lib/api";
import { useOnClickOutside } from "@/src/hooks/useOnClickOutside";
import type { DashboardForm, Notificacao, Registro, Role, View } from "@/src/types/dashboard";
import { EMPTY_FORM, AREAS, formatarTempo, AREA_CORES, getFileTipo } from "@/src/lib/dashboard";
import {
  DOCUMENTS_BUCKET,
  PREVIEWS_BUCKET,
  VIEWER_PUBLIC_GOV_LINK,
  VIEWER_PUBLIC_PREVIEW_IMAGE,
  uploadToStorage,
  deleteFromStorage,
  fetchSignedUrl,
  fetchPublicUrl,
  generateStoragePath,
  ALLOWED_PREVIEW_TYPES,
  ALLOWED_DOCUMENT_EXTENSIONS,
} from "@/src/lib/storage";
import { fetchRegistrosApi, createRegistroApi, updateRegistroApi, deleteRegistroApi } from "@/src/lib/registros";
import { fetchNotificacoesApi, createNotificacaoApi, markNotificacoesLidasApi } from "@/src/lib/notificacoes";

const GOV_LINK_PATTERN =
  "https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis";
const SHAREPOINT_REPLACEMENT =
  "https://colaboragov.sharepoint.com/sites/DAGE-COTIC/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2FDAGE%2DCOTIC%2FShared%20Documents%2FCOTIC%2F06%20%2D%20Sistemas%2FPOWERBI%2FPaineis&viewid=6659a9cb%2D9359%2D4a49%2Da635%2Df254250d4a57&xsdata=MDV8MDJ8fDI4ZDM5YjcwMDc4YzRkNDU1MTg2MDhkZTlhMjM5ZDdhfDQ1NjIxM2NmNzA3MzQ3YzZiZjQ5NDFiNjU0YWQ0NDlifDB8MHw2MzkxMTc2NzQ4ODk3NjQ5Mzl8VW5rbm93bnxWR1ZoYlhOVFpXTjFjbWwwZVZObGNuWnBZMlY4ZXlKRFFTSTZJbFJsWVcxelgwRlVVRk5sY25acFkyVmZVMUJQVEU5R0lpd2lWaUk2SWpBdU1DNHdNREF3SWl3aVVDSTZJbGRwYmpNeUlpd2lRVTRpT2lKUGRHaGxjaUlzSWxkVUlqb3hNWDA9fDF8TDJOb1lYUnpMekU1T2pVd05tVmhORGcwTFdZd09XTXROR1JqTlMwNU9EZ3lMVEU0TlRGa056WXdOVFV4TlY4M1pEaGpZbVJsTWkwM1lURTRMVFE1TjJFdE9UTTVZeTB3WWpkaVlXWmlObVF3WkRGQWRXNXhMbWRpYkM1emNHRmpaWE12YldWemMyRm5aWE12TVRjM05qRTNNRFk0TmpRMU5RPT18ZDhkZDE1YWY4YzMyNDkyZGMxOWQwOGRlOWEyMzlkNzl8ZWE4N2MwNTcyNDdlNGNhMzhiNmY0ZWMwNmEzNmQ2NjE%3D&sdata=TlVweVZGN2VwbkU5V1BMYnlCUVRYMDd4aDlncTZyWUV2WXlhSU9UbkQzRT0%3D&ovuser=456213cf-7073-47c6-bf49-41b654ad449b%2Cvictor.fernandes%40planejamento.gov.br";

const normalizeFonteDados = (fonte?: string) => {
  if (!fonte) return fonte;
  return fonte.includes(GOV_LINK_PATTERN) ? fonte.replaceAll(GOV_LINK_PATTERN, SHAREPOINT_REPLACEMENT) : fonte;
};

export function useDashboard() {
  const router = useRouter();

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
  const [form, setForm] = useState<DashboardForm>(EMPTY_FORM);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const [viewingNome, setViewingNome] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroSensivel, setFiltroSensivel] = useState("");
  const [filtroFonte, setFiltroFonte] = useState(true); // default: mostrar apenas com fonte disponível
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = role === "admin";
  const isEditor = role === "editor";
  const isViewer = role === "viewer";
  const canEdit = isAdmin || isEditor;
  const canDelete = isAdmin;

  useOnClickOutside(notifRef, () => setShowNotif(false));

  const fetchRegistros = useCallback(async () => {
    try {
      const data = await fetchRegistrosApi();
      setRegistros(
        (data ?? []).map((registro) => ({
          ...registro,
          fonte_dados: normalizeFonteDados(registro.fonte_dados),
        }))
      );
    } catch (fetchError) {
      setError((fetchError as Error).message || "Erro ao carregar registros.");
    }
  }, []);

  const fetchNotificacoes = useCallback(async () => {
    if (!isAdmin) {
      setNotificacoes([]);
      return;
    }

    try {
      const data = await fetchNotificacoesApi();
      setNotificacoes(data ?? []);
    } catch (fetchError) {
      setError((fetchError as Error).message || "Erro ao carregar notificações.");
    }
  }, [isAdmin]);

  const criarNotificacao = useCallback(async (tipo: string, mensagem: string) => {
    try {
      await createNotificacaoApi({ tipo, mensagem, lida: false });
    } catch (createError) {
      console.error("Erro ao criar notificação:", (createError as Error).message || "Erro desconhecido");
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

      try {
        const profileData = await fetchJson<{ role: Role; display_name: string }>(`/api/profile?id=${encodeURIComponent(sessionUser.id)}`);
        if (profileData?.role) setRole(profileData.role as Role);
        if (profileData?.display_name) setDisplayName(profileData.display_name);
      } catch (profileError) {
        console.error("Erro ao carregar perfil:", (profileError as Error).message);
        setRole("viewer");
      }

      await fetchRegistros();
      await fetchNotificacoes();
      setLoading(false);
    };

    void loadData();
  }, [router, fetchRegistros, fetchNotificacoes]);

  const marcarTodasLidas = async () => {
    try {
      await markNotificacoesLidasApi();
    } catch (markError) {
      console.error((markError as Error).message || "Erro ao marcar notificações lidas.");
    }
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
  };

  const isPreviewFileTypeAllowed = (file: File) => ALLOWED_PREVIEW_TYPES.includes(file.type.toLowerCase());
  const isDocumentFileAllowed = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    return Boolean(ext && ALLOWED_DOCUMENT_EXTENSIONS.includes(ext));
  };

  const abrirCategoria = (area: string) => {
    setAreaAtiva(area);
    setBusca("");
    setFiltroSensivel("");
    setFiltroFonte(true);
    setView("documentos");
  };

  const voltarCategorias = () => {
    setView("categorias");
    setAreaAtiva("");
    setBusca("");
    setFiltroSensivel("");
    setFiltroFonte(true);
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

    if (preview && !isPreviewFileTypeAllowed(preview)) {
      setFormError("Tipo de preview inválido. Use PNG ou JPG.");
      return;
    }

    if (arquivo && !isDocumentFileAllowed(arquivo)) {
      setFormError("Tipo de arquivo inválido. Use PDF, Excel, Word, PowerPoint ou PBIX.");
      return;
    }

    setSaving(true);
    setFormError("");

    let arquivo_path: string | undefined;
    let preview_path: string | undefined;

    if (arquivo) {
      const path = generateStoragePath(form.nome, arquivo);

      try {
        await uploadToStorage(DOCUMENTS_BUCKET, path, arquivo);
      } catch (uploadError) {
        setFormError((uploadError as Error).message || "Erro no upload do arquivo.");
        setSaving(false);
        return;
      }

      arquivo_path = path;

      
    }

    if (preview) {
      const path = generateStoragePath(form.nome, preview, "_preview");

      try {
        await uploadToStorage(PREVIEWS_BUCKET, path, preview);
      } catch (uploadError) {
        setFormError((uploadError as Error).message || "Erro no upload do preview.");
        setSaving(false);
        return;
      }

      preview_path = path;

      
    }

    const autor = displayName || user?.email || "Alguém";

    if (editingId) {
      const updateData: Partial<Registro> = { ...form, updated_at: new Date().toISOString() };
      if (arquivo_path) updateData.arquivo_path = arquivo_path;
      if (preview_path) updateData.preview_path = preview_path;

      try {
        await updateRegistroApi(editingId, updateData);
      } catch (updateError) {
        setFormError((updateError as Error).message || "Erro ao atualizar o painel.");
        setSaving(false);
        return;
      }

      
    } else {
      const payload = {
        ...form,
        arquivo_path,
        preview_path,
        criado_por: user?.id,
      };

      try {
        await createRegistroApi(payload);
      } catch (createError) {
        setFormError((createError as Error).message || "Erro ao cadastrar o painel.");
        setSaving(false);
        return;
      }

      
    }

    await fetchRegistros();
    await fetchNotificacoes();
    setSaving(false);
    setShowModal(false);
  };

  const handleDelete = async (id: string, arquivoPath?: string, previewPath?: string, nome?: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;
    if (arquivoPath) {
      try {
        await deleteFromStorage(DOCUMENTS_BUCKET, arquivoPath);
      } catch (deleteError) {
        console.error((deleteError as Error).message);
      }
    }
    if (previewPath) {
      try {
        await deleteFromStorage(PREVIEWS_BUCKET, previewPath);
      } catch (deleteError) {
        console.error((deleteError as Error).message);
      }
    }

    try {
      await deleteRegistroApi(id);
    } catch (deleteError) {
      setError((deleteError as Error).message || "Erro ao excluir o painel.");
      return;
    }

    

    await fetchNotificacoes();
    setRegistros((current) => current.filter((r) => r.id !== id));
  };

  const handleVisualizarArquivo = async (arquivoPath: string, nome: string) => {
    const ext = arquivoPath.split(".").pop()?.toLowerCase();
    let fileUrl: string | null = null;

    try {
      fileUrl = await fetchSignedUrl(DOCUMENTS_BUCKET, arquivoPath, 3600);
    } catch (signedUrlError) {
      setError((signedUrlError as Error).message || "Não foi possível gerar o link de visualização.");
      return;
    }

    if (!fileUrl) {
      setError("Não foi possível gerar o link de visualização.");
      return;
    }

    setDownloadUrl(fileUrl);
    setViewingNome(nome);

    
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
    try {
      return await fetchPublicUrl(PREVIEWS_BUCKET, previewPath);
    } catch (previewError) {
      console.error((previewError as Error).message);
      return null;
    }
  };

  const roleLabel: Record<Role, string> = {
    admin: "Admin",
    editor: "Desenvolvedor",
    viewer: "Viewer",
  };

  const documentosFiltrados = useMemo(() => {
    const temFonteDados = (fonte?: string) => fonte && fonte.trim().length > 0;

    return registros
      .filter((r) => r.categoria === areaAtiva)
      
      // Viewers só não veem dados SENSÍVEIS (não relacionado a fonte_dados)
      .filter((r) => {
        if (isViewer && r.dados_sensiveis) {
          return false;
        }
        return true;
      })

      .filter((r) =>
        !busca ||
        r.nome.toLowerCase().includes(busca.toLowerCase()) ||
        r.descricao?.toLowerCase().includes(busca.toLowerCase())
      )

      .filter((r) =>
        filtroSensivel === ""
          ? true
          : filtroSensivel === "sim"
          ? r.dados_sensiveis
          : !r.dados_sensiveis
      )

      // Filtrar por fonte de dados apenas se filtroFonte está ativo
      .filter((r) => !filtroFonte || temFonteDados(r.fonte_dados));
  }, [
    registros,
    areaAtiva,
    busca,
    filtroSensivel,
    filtroFonte,
    isViewer,
  ]);
  const totalDocumentos = registros.length;
  const temFiltroAtivo = Boolean(busca || filtroSensivel || filtroFonte === false);

  return {
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
    setShowNotif,
    marcarTodasLidas,
  };
}
