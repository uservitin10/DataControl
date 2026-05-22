import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { fetchJson } from "@/lib/api";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import type { Notificacao, Sistema, SistemaForm, Role } from "@/types/dashboard";
import { fetchNotificacoesApi, markNotificacoesLidasApi } from "@/lib/notificacoes";
import { fetchSistemasApi, createSistemaApi, updateSistemaApi, deleteSistemaApi } from "@/lib/sistemas";
import { DEFAULT_PERMISSIONS, resolvePermissions, type Permissions } from "@/lib/permissions";

const EMPTY_FORM: SistemaForm = {
  sigla: "",
  nome: "",
  descricao: "",
  gestores: "",
  sustentacao: "",
  url_producao: "",
  url_homologacao: "",
  gestao_dados: "",
  acesso_bd: "",
  tipo_acesso: "publico",
  secretaria: "",
};

// Validação reutilizável
const validateSistemaForm = (form: SistemaForm): string | null => {
  if (!form.sigla.trim() || !form.nome.trim() || !form.descricao.trim()) {
    return "Preencha os campos obrigatórios (Sigla, Nome, Descrição)";
  }
  return null;
};

export function useSistemas() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>("viewer");
  const [displayName, setDisplayName] = useState<string>("");
  const [permissions, setPermissions] = useState<Permissions>(DEFAULT_PERMISSIONS.viewer);
  const [sistemas, setSistemas] = useState<Sistema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SistemaForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  useOnClickOutside(notifRef, () => setShowNotif(false));

  // Estados de filtro
  const [busca, setBusca] = useState("");
  const [filtroAmbiente, setFiltroAmbiente] = useState<"producao" | "homologacao" | "ambos">("ambos");
  const [filtroHomologados, setFiltroHomologados] = useState(true);
  const [filtroAcessiveis, setFiltroAcessiveis] = useState(true);
  const [filtroTipoAcesso, setFiltroTipoAcesso] = useState<"" | "publico" | "restrito">("");
  const [filtroSecretaria, setFiltroSecretaria] = useState("");

  const isAdmin = role === "admin";
  const isEditor = role === "editor";
  const canView = permissions.sistemas.view;
  const canEdit = isAdmin || permissions.sistemas.edit;
  const canCreate = isAdmin || permissions.sistemas.create;
  const canDelete = isAdmin || permissions.sistemas.delete;

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

  const marcarTodasLidas = async () => {
    try {
      await markNotificacoesLidasApi();
    } catch (markError) {
      console.error((markError as Error).message || "Erro ao marcar notificações lidas.");
    }

    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
  };

  // Verificar se há filtro ativo
  const temFiltroAtivo = busca !== "" || filtroAmbiente !== "ambos" || filtroHomologados || filtroAcessiveis || filtroTipoAcesso !== "" || filtroSecretaria !== "";

  // Aplicar filtros
  const sistemasFiltrados = useMemo(() => {
    return sistemas
      .filter((s) =>
        !busca ||
        s.nome.toLowerCase().includes(busca.toLowerCase()) ||
        s.descricao.toLowerCase().includes(busca.toLowerCase()) ||
        s.sigla.toLowerCase().includes(busca.toLowerCase())
      )
      .filter((s) => {
        if (filtroAmbiente === "producao") {
          return s.url_producao && s.url_producao.length > 0;
        }
        if (filtroAmbiente === "homologacao") {
          return s.url_homologacao && s.url_homologacao.length > 0;
        }
        // ambos - sem filtro
        return true;
      })
      .filter((s) => !filtroHomologados || (s.url_homologacao && s.url_homologacao.length > 0))
      .filter((s) => !filtroAcessiveis || (s.url_producao && s.url_producao.length > 0))
      .filter((s) => !filtroTipoAcesso || (s.tipo_acesso === filtroTipoAcesso))
      .filter((s) => !filtroSecretaria || (s.secretaria === filtroSecretaria));
  }, [sistemas, busca, filtroAmbiente, filtroHomologados, filtroAcessiveis, filtroTipoAcesso, filtroSecretaria]);

  // Inicializar usuário e role
  useEffect(() => {
    const initUser = async () => {
      let userRole: Role = "viewer";
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const currentUser = sessionData.session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          try {
            const profileData = await fetchJson<{ role: Role; display_name: string; permissions?: Partial<Permissions> }>(
              `/api/profile?id=${encodeURIComponent(currentUser.id)}`
            );

            userRole = (profileData?.role as Role) || "viewer";
            setRole(userRole);
            setDisplayName(profileData?.display_name || currentUser.email || "");
            setPermissions(resolvePermissions(userRole, profileData?.permissions));
          } catch (profileError) {
            console.error("Erro ao carregar perfil:", (profileError as Error).message);
            setRole("viewer");
            setDisplayName(currentUser.email || "Usuário");
            setPermissions(resolvePermissions("viewer"));
          }

          // Se for viewer, inicializa os filtros como true
          if (userRole === "viewer") {
            setFiltroHomologados(true);
            setFiltroAcessiveis(true);
            setFiltroTipoAcesso("publico");
          } else {
            // admin, editor, painel_editor, sistema_editor, inventario_editor - mostrar todos
            setFiltroHomologados(false);
            setFiltroAcessiveis(false);
            setFiltroTipoAcesso("");
          }

          await fetchNotificacoes();
        } else {
          // Visitante não autenticado deve ver apenas sistemas públicos com produção
          setRole("viewer");
          setDisplayName("Visitante");
          setFiltroHomologados(true);
          setFiltroAcessiveis(true);
          setFiltroTipoAcesso("publico");
        }
      } catch (err) {
        console.error("Erro ao inicializar usuário:", err);
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, [fetchNotificacoes]);

  // Carregar sistemas
  const fetchSistemas = useCallback(async () => {
    try {
      const data = await fetchSistemasApi();
      setSistemas(data ?? []);
      setError("");
    } catch (fetchError) {
      setError((fetchError as Error).message || "Erro ao carregar sistemas.");
    }
  }, []);

  // Fetch inicial
  useEffect(() => {
    if (!loading) {
      fetchSistemas();
    }
  }, [loading, fetchSistemas]);

  // Criar novo sistema
  const handleCreate = async () => {
    const validationError = validateSistemaForm(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await createSistemaApi(form);
      await fetchSistemas();
      setShowModal(false);
      setForm(EMPTY_FORM);
      setError("");
    } catch (createError) {
      setFormError((createError as Error).message || "Erro ao criar sistema.");
    } finally {
      setSaving(false);
    }
  };

  // Editar sistema
  const handleEdit = (sistema: Sistema) => {
    setEditingId(sistema.id ?? null);
    setForm({
      sigla: sistema.sigla,
      nome: sistema.nome,
      descricao: sistema.descricao,
      gestores: sistema.gestores,
      sustentacao: sistema.sustentacao,
      url_producao: sistema.url_producao || "",
      url_homologacao: sistema.url_homologacao || "",
      gestao_dados: sistema.gestao_dados,
      acesso_bd: sistema.acesso_bd,
      tipo_acesso: sistema.tipo_acesso || "publico",
      secretaria: sistema.secretaria || "",
    });
    setShowModal(true);
    setFormError("");
  };

  // Salvar edição
  const handleSave = async () => {
    const validationError = validateSistemaForm(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    if (!editingId) {
      setFormError("ID do sistema não encontrado");
      return;
    }

    setSaving(true);
    try {
      await updateSistemaApi(editingId, form);
      await fetchSistemas();
      setShowModal(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      setError("");
    } catch (saveError) {
      setFormError((saveError as Error).message || "Erro ao salvar sistema.");
    } finally {
      setSaving(false);
    }
  };

  // Excluir sistema
  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este sistema?")) return;

    try {
      await deleteSistemaApi(id);
      await fetchSistemas();
      setError("");
    } catch (deleteError) {
      setError((deleteError as Error).message || "Erro ao excluir sistema.");
    }
  };

  // Abre modal para novo sistema
  const openNewModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowModal(true);
  };

  // Fecha modal
  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  };

  // Limpar filtros
  const clearFilters = () => {
    setBusca("");
    setFiltroAmbiente("ambos");
    setFiltroHomologados(false);
    setFiltroAcessiveis(false);
    setFiltroTipoAcesso("");
    setFiltroSecretaria("");
  };

  return {
    user,
    role,
    displayName,
    sistemas: sistemasFiltrados,
    loading,
    error,
    showModal,
    editingId,
    form,
    saving,
    formError,
    isAdmin,
    isEditor,
    permissions,
    canEdit,
    canCreate,
    canDelete,
    notificacoes,
    showNotif,
    setShowNotif,
    notifRef,
    marcarTodasLidas,
    // Filtros
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
    // Ações
    fetchSistemas,
    handleCreate,
    handleEdit,
    handleSave,
    handleDelete,
    openNewModal,
    closeModal,
    setForm,
    setError,
  };
}