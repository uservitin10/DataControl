"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/src/components/Logo";
import { supabase } from "@/src/lib/supabase";

type Role = "admin" | "editor" | "viewer";

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
};

export default function UsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<Role>("viewer");
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState("");

  const fetchUsuarios = async () => {
    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (fetchError) setError(fetchError.message);
    else setUsuarios((data ?? []) as Profile[]);
  };

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user ?? null;
      if (!sessionUser) { router.replace("/login"); return; }

      const { data: profileData } = await supabase
        .from("profiles").select("role").eq("id", sessionUser.id).single();

      if (profileData?.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      await fetchUsuarios();
      setLoading(false);
    };
    void load();
  }, [router]);

  const handleEditRole = (usuario: Profile) => {
    setEditingId(usuario.id);
    setEditingRole(usuario.role);
    setSuccess("");
    setError("");
  };

  const handleSaveRole = async (id: string) => {
    setSaving(true);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: editingRole })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess("Role atualizada com sucesso!");
      setEditingId(null);
      await fetchUsuarios();
    }
    setSaving(false);
  };

  const usuariosFiltrados = usuarios.filter((u) =>
    !busca ||
    u.email?.toLowerCase().includes(busca.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(busca.toLowerCase())
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
        <p style={{ color: "#64748b" }}>Carregando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      <nav className="px-6 py-4 shadow-md" style={{ background: "linear-gradient(135deg, #1a2744 0%, #2d3a5c 100%)" }}>
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="h-10 w-auto" width={40} height={40} alt="Data Control" />
            <div>
              <p className="text-white font-semibold text-sm">Gerenciamento de Usuários</p>
              <p className="text-white/70 text-xs">Data Control</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => router.push("/dashboard")}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              ← Dashboard
            </button>
            <button 
              type="button" 
              onClick={() => router.push("/dashboard/profile")}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              Meu Perfil
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#1a2744" }}>Gerenciamento de Usuários</h1>
          <p className="text-base" style={{ color: "#64748b" }}>
            {usuarios.length} usuário{usuarios.length !== 1 ? "s" : ""} cadastrado{usuarios.length !== 1 ? "s" : ""} no sistema
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border-l-4 bg-red-50 p-4" style={{ borderColor: "#991b1b" }}>
            <p className="text-sm font-medium" style={{ color: "#991b1b" }}>{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-xl border-l-4 bg-green-50 p-4" style={{ borderColor: "#15803d" }}>
            <p className="text-sm font-medium" style={{ color: "#15803d" }}>{success}</p>
          </div>
        )}

        {/* Busca */}
        <div className="mb-6">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🔍</span>
            <input 
              type="text" 
              value={busca} 
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="w-full rounded-lg border pl-12 pr-4 py-3 text-sm outline-none bg-white shadow-sm hover:shadow-md transition-shadow"
              style={{ borderColor: "#cbd5e1", color: "#1e293b" }} 
            />
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-hidden rounded-xl border bg-white shadow-md hover:shadow-lg transition-shadow" style={{ borderColor: "#e2e8f0" }}>
          <table className="min-w-full text-left text-sm">
            <thead style={{ backgroundColor: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
              <tr>
                {["NOME", "EMAIL", "NÍVEL DE ACESSO", "CADASTRADO EM", "AÇÕES"].map((h) => (
                  <th key={h} className="px-6 py-4 text-xs font-semibold tracking-wide uppercase" style={{ color: "#475569" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.length > 0 ? usuariosFiltrados.map((usuario, i) => (
                <tr 
                  key={usuario.id} 
                  style={{ 
                    borderTop: "1px solid #e2e8f0", 
                    backgroundColor: i % 2 === 0 ? "white" : "#f9fafb",
                    transition: "background-color 0.2s"
                  }}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4 font-semibold" style={{ color: "#1a2744" }}>
                    {usuario.display_name || <span style={{ color: "#94a3b8" }}>—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium" style={{ color: "#64748b" }}>
                    {usuario.email}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === usuario.id ? (
                      <select
                        value={editingRole}
                        onChange={(e) => setEditingRole(e.target.value as Role)}
                        className="rounded-lg border px-3 py-1.5 text-sm outline-none font-medium transition-all"
                        style={{ borderColor: "#cbd5e1", color: "#1e293b" }}
                      >
                        <option value="viewer">Apenas Leitura</option>
                        <option value="editor">Desenvolvedor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    ) : (
                      <span className="rounded-lg px-3 py-1.5 text-xs font-semibold inline-block" 
                        style={{ 
                          backgroundColor: roleLabels[usuario.role]?.bg, 
                          color: roleLabels[usuario.role]?.text 
                        }}>
                        {roleLabels[usuario.role]?.label}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: "#94a3b8" }}>
                    {usuario.created_at ? new Date(usuario.created_at).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === usuario.id ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleSaveRole(usuario.id)} 
                          disabled={saving}
                          className="rounded-lg px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                          style={{ backgroundColor: "#1a2744" }}>
                          {saving ? "..." : "Salvar"}
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="rounded-lg px-3 py-1.5 text-sm font-medium border hover:bg-slate-50 transition-colors"
                          style={{ borderColor: "#cbd5e1", color: "#475569" }}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleEditRole(usuario)}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>
                        Editar Role
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm" style={{ color: "#94a3b8" }}>
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}