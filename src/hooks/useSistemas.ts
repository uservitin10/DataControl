import { useEffect, useState, useCallback, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import type { Sistema, SistemaForm, Role } from "@/types/dashboard";
import { fetchSistemasApi, createSistemaApi, updateSistemaApi, deleteSistemaApi } from "@/lib/sistemas";
import { DEFAULT_PERMISSIONS, type Permissions } from "@/lib/permissions";
import { loadClientUser, getClientUserState } from "@/lib/auth";

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

  // Estados de filtro
  const [busca, setBusca] = useState("");
  const [filtroAmbiente, setFiltroAmbiente] = useState<"producao" | "homologacao" | "ambos">("ambos");
  const [filtroHomologados, setFiltroHomologados] = useState(true);
  const [filtroAcessiveis, setFiltroAcessiveis] = useState(true);
  const [filtroTipoAcesso, setFiltroTipoAcesso] = useState<"" | "publico" | "restrito">("");
  const [filtroSecretaria, setFiltroSecretaria] = useState("");

  const isAdmin = role === "admin";
  const isEditor = role === "editor";
  const canEdit = isAdmin || permissions.sistemas.edit;
  const canCreate = isAdmin || permissions.sistemas.create;
  const canDelete = isAdmin || permissions.sistemas.delete;

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
      try {
        const clientUser = await loadClientUser();
        const clientUserState = getClientUserState(clientUser);

        setUser(clientUser.user);
        setRole(clientUserState.role);
        setDisplayName(clientUserState.displayName);
        setPermissions(clientUserState.permissions);

        // Se for viewer, inicializa os filtros como true
        if (clientUser.role === "viewer") {
          setFiltroHomologados(true);
          setFiltroAcessiveis(true);
          setFiltroTipoAcesso("publico");
        } else {
          // admin, editor, painel_editor, sistema_editor, inventario_editor - mostrar todos
          setFiltroHomologados(false);
          setFiltroAcessiveis(false);
          setFiltroTipoAcesso("");
        }

      } catch (err) {
        console.error("Erro ao inicializar usuário:", err);
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, []);

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