"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import { fetchJson, patchJson } from "@/lib/api";
import { DEFAULT_PERMISSIONS } from "@/lib/permissions";
import type { PermissionModule, Permissions } from "@/lib/permissions";

type Role = "admin" | "editor" | "viewer" | "painel_editor" | "sistema_editor" | "inventario_editor";

type Profile = {
  id: string;
  email: string;
  display_name?: string;
  role: Role;
  created_at?: string;
};

const roleLabels: Record<Role, { label: string; bg: string; text: string }> = {
  admin:  { label: "Administrador",  bg: "#fef2f2", text: "#991b1b" },
  editor: { label: "Desenvolvedor",  bg: "#eff6ff", text: "#1d4ed8" },
  viewer: { label: "Apenas Leitura", bg: "#f1f5f9", text: "#475569" },
  painel_editor: { label: "Editor em Painel", bg: "#eef2ff", text: "#1d4ed8" },
  sistema_editor: { label: "Editor de Sistemas", bg: "#f3e8ff", text: "#6b21a8" },
  inventario_editor: { label: "Editor de Inventário", bg: "#dcfce7", text: "#166534" },
};

export default function UsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [editingRole, setEditingRole] = useState<Role>("viewer");
  const [editingPermissions, setEditingPermissions] = useState<Permissions | null>(null);
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState("");

  const fetchUsuarios = async () => {
    try {
      const response = await fetchJson<{ data: Profile[]; total: number }>("/api/usuarios");
      setUsuarios(response?.data ?? []);
    } catch (fetchError) {
      setUsuarios([]);
      setError((fetchError as Error).message);
    }
  };

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user ?? null;
      if (!sessionUser) {
        router.replace("/login");
        return;
      }

      try {
        const profile = await fetchJson<{ role: Role }>(
          `/api/profile?id=${encodeURIComponent(sessionUser.id)}`
        );

        if (profile.role !== "admin") {
          router.replace("/dashboard");
          return;
        }
      } catch (fetchError) {
        setError((fetchError as Error).message);
        router.replace("/login");
        return;
      }

      await fetchUsuarios();
      setLoading(false);
    };
    void load();
  }, [router]);

  const ALL_MODULES: Array<{ key: PermissionModule; label: string }> = [
    { key: "dashboard", label: "Painel" },
    { key: "sistemas", label: "Sistemas" },
    { key: "inventario", label: "Inventário" },
    { key: "registros", label: "Registros" },
    { key: "notificacoes", label: "Notificações" },
    { key: "areas", label: "Áreas" },
    { key: "fontes_dados", label: "Fontes de Dados" },
  ];

  const checkboxClass = "h-4 w-4 rounded border-slate-300 text-gov-blue focus:ring-gov-blue";

  const createEmptyPermissions = (): Permissions => {
    return ALL_MODULES.reduce((acc, module) => {
      acc[module.key] = { view: false, edit: false, create: false, delete: false };
      return acc;
    }, {} as Permissions);
  };

  const getDefaultPermissions = (role: Role): Permissions => {
    return DEFAULT_PERMISSIONS[role] ?? createEmptyPermissions();
  };

  const handleEditRole = async (usuario: Profile) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const profile = await fetchJson<{ role: Role; display_name?: string; permissions: Permissions }>(
        `/api/profile?id=${encodeURIComponent(usuario.id)}`
      );

      setSelectedUser(usuario);
      const roleToUse = profile.role ?? usuario.role;
      setEditingRole(roleToUse);
      setEditingPermissions(profile.permissions ?? getDefaultPermissions(roleToUse));
    } catch (fetchError) {
      setError((fetchError as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = (newRole: Role) => {
    setEditingRole(newRole);
    setEditingPermissions(getDefaultPermissions(newRole));
  };

  const handleSaveRole = async (id: string) => {
    if (!editingPermissions) {
      setError("Permissões inválidas.");
      return;
    }

    setSaving(true);
    try {
      await patchJson(`/api/profile?id=${encodeURIComponent(id)}`, {
        role: editingRole,
        permissions: editingPermissions,
      });
      setSuccess("Permissões atualizadas com sucesso!");
      setSelectedUser(null);
      setEditingPermissions(null);
      await fetchUsuarios();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const usuariosFiltrados = usuarios.filter((u) =>
    !busca ||
    u.email?.toLowerCase().includes(busca.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(busca.toLowerCase())
  );

  const totalAdmins = usuarios.filter((u) => u.role === "admin").length;
  const totalViewers = usuarios.filter((u) => u.role === "viewer").length;

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
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-3xl bg-slate-900/80 px-4 py-3 text-left transition hover:bg-white/10"
          >
            <Logo className="h-10 w-auto" width={40} height={40} alt="Data Control" />
            <div>
              <p className="text-sm font-semibold text-white">Gerenciamento de Usuários</p>
              <p className="text-xs text-slate-300">Data Control</p>
            </div>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-gov-heading">Gerenciamento de Usuários</h1>
              <p className="text-base text-gov-muted">
                {usuarios.length} usuário{usuarios.length !== 1 ? "s" : ""} cadastrado{usuarios.length !== 1 ? "s" : ""} no sistema
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200/80 bg-slate-50/90 px-5 py-4 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Total de usuários</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{usuarios.length}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200/80 bg-slate-50/90 px-5 py-4 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Administradores</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{totalAdmins}</p>
            </div>
            <div className="rounded-3xl border border-slate-200/80 bg-slate-50/90 px-5 py-4 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Apenas Leitura</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{totalViewers}</p>
            </div>
            <div className="rounded-3xl border border-slate-200/80 bg-slate-50/90 px-5 py-4 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Exibindo</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{usuariosFiltrados.length} de {usuarios.length}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="gov-status-error mb-6 rounded-xl border-l-4 p-4">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
        {success && (
          <div className="gov-status-success mb-6 rounded-xl border-l-4 p-4">
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-[60%]">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="gov-input w-full rounded-2xl border border-slate-200 bg-white/95 pl-12 pr-4 py-3 text-sm shadow-sm transition-shadow duration-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard/profile")}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Meu Perfil
          </button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl transition-shadow hover:shadow-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm divide-y divide-slate-200/80">
              <thead className="sticky top-0 z-10 bg-slate-950/98 text-white shadow-sm border-b border-slate-800/50 backdrop-blur-sm">
              <tr>
                {['NOME', 'EMAIL', 'NÍVEL DE ACESSO', 'CADASTRADO EM', 'AÇÕES'].map((h) => (
                  <th key={h} className="px-6 py-4 text-xs font-semibold tracking-wide uppercase text-slate-300">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {usuariosFiltrados.length > 0 ? usuariosFiltrados.map((usuario, i) => (
                <tr
                  key={usuario.id}
                  className={`transition-colors duration-150 border-b border-slate-200/80 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100`}
                >
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {usuario.display_name || <span className="text-slate-500">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">{usuario.email}</td>
                  <td className="px-6 py-4">
                    <span
                      className="inline-flex items-center rounded-full border border-slate-200/80 px-3 py-1 text-xs font-semibold shadow-sm ring-1 ring-slate-200/70"
                      style={{ backgroundColor: roleLabels[usuario.role]?.bg, color: roleLabels[usuario.role]?.text }}
                    >
                      {roleLabels[usuario.role]?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {usuario.created_at ? new Date(usuario.created_at).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleEditRole(usuario)}
                      className="rounded-3xl px-3 py-2 text-sm font-semibold text-slate-900 border border-slate-200/80 bg-slate-100 shadow-sm transition duration-200 hover:bg-slate-50 hover:shadow-md"
                    >
                      Editar permissões
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
        </div>

        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-[0_36px_90px_-36px_rgba(15,23,42,0.3)]">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-xl font-semibold text-slate-900">Editar permissões do usuário</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Defina o acesso por módulo. O role é usado apenas como fallback quando não houver override do usuário.
                </p>
              </div>
              <div className="max-h-[75vh] space-y-6 overflow-y-auto px-6 py-6">
                <div>
                  <p className="text-sm font-medium text-slate-600">Usuário</p>
                  <p className="mt-2 text-base text-slate-900">{selectedUser.display_name || selectedUser.email}</p>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">Role (fallback)</label>
                  <select
                    value={editingRole}
                    onChange={(e) => handleRoleChange(e.target.value as Role)}
                    className="gov-input mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="viewer">Apenas Leitura</option>
                    <option value="painel_editor">Editor em Painel</option>
                    <option value="sistema_editor">Editor de Sistemas</option>
                    <option value="inventario_editor">Editor de Inventário</option>
                    <option value="editor">Desenvolvedor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Permissões por módulo</p>
                      <p className="mt-1 text-sm text-slate-500">Use overrides individuais para cada área do sistema.</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5">
                    {ALL_MODULES.map((module) => {
                      const modulePerms = editingPermissions?.[module.key] ?? { view: false, edit: false, create: false, delete: false };

                      return (
                        <div key={module.key} className="rounded-3xl border border-slate-200/80 bg-slate-50 p-5 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.08)]">
                          <div className="mb-4 flex items-center justify-between gap-4">
                            <p className="text-base font-semibold text-slate-900">{module.label}</p>
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${modulePerms.view ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              {modulePerms.view ? "Ativo" : "Bloqueado"}
                            </span>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <label className="flex items-center gap-2 rounded-3xl border border-slate-200/80 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-md">
                              <input
                                type="checkbox"
                                checked={modulePerms.view}
                                onChange={(e) => setEditingPermissions((prev) => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    [module.key]: {
                                      ...prev[module.key],
                                      view: e.target.checked,
                                    },
                                  };
                                })}
                                className={checkboxClass}
                              />
                              Ver
                            </label>
                            <label className="flex items-center gap-2 rounded-3xl border border-slate-200/80 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-md">
                              <input
                                type="checkbox"
                                checked={modulePerms.edit}
                                onChange={(e) => setEditingPermissions((prev) => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    [module.key]: {
                                      ...prev[module.key],
                                      edit: e.target.checked,
                                    },
                                  };
                                })}
                                className={checkboxClass}
                              />
                              Editar
                            </label>
                            <label className="flex items-center gap-2 rounded-3xl border border-slate-200/80 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-md">
                              <input
                                type="checkbox"
                                checked={modulePerms.create}
                                onChange={(e) => setEditingPermissions((prev) => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    [module.key]: {
                                      ...prev[module.key],
                                      create: e.target.checked,
                                    },
                                  };
                                })}
                                className={checkboxClass}
                              />
                              Criar
                            </label>
                            <label className="flex items-center gap-2 rounded-3xl border border-slate-200/80 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-md">
                              <input
                                type="checkbox"
                                checked={modulePerms.delete}
                                onChange={(e) => setEditingPermissions((prev) => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    [module.key]: {
                                      ...prev[module.key],
                                      delete: e.target.checked,
                                    },
                                  };
                                })}
                                className={checkboxClass}
                              />
                              Excluir
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-200/80 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setEditingPermissions(null);
                  }}
                  className="gov-button-secondary rounded-3xl px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 transition duration-200 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => selectedUser && handleSaveRole(selectedUser.id)}
                  disabled={saving}
                  className="gov-button rounded-3xl px-4 py-2 text-sm font-medium bg-slate-900 text-white shadow-lg shadow-slate-950/20 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
