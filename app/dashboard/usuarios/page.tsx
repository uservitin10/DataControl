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
      <nav className="px-6 py-3 flex items-center justify-between" style={{ backgroundColor: "#1a2744" }}>
        <div className="flex items-center">
          <Logo className="h-10 w-auto" width={40} height={40} alt="Data Control" />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.push("/dashboard")}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-white/80" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
            ← Dashboard
          </button>
          <button type="button" onClick={() => router.push("/dashboard/profile")}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-white/80" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
            Meu Perfil
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-medium" style={{ color: "#1a2744" }}>Gerenciamento de Usuários</h1>
          <p className="text-sm" style={{ color: "#64748b" }}>{usuarios.length} usuário{usuarios.length !== 1 ? "s" : ""} cadastrado{usuarios.length !== 1 ? "s" : ""}</p>
        </div>

        {error && <p className="mb-4 rounded-lg border p-3 text-sm border-red-200 bg-red-50 text-red-600">{error}</p>}
        {success && <p className="mb-4 rounded-lg border p-3 text-sm border-green-200 bg-green-50 text-green-700">{success}</p>}

        {/* Busca */}
        <div className="mb-4">
          <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="🔍 Buscar por nome ou email..."
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none bg-white"
            style={{ borderColor: "#cbd5e1", color: "#1e293b" }} />
        </div>

        {/* Tabela */}
        <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: "#e2e8f0" }}>
          <table className="min-w-full text-left text-sm">
            <thead style={{ backgroundColor: "#f1f5f9" }}>
              <tr>
                {["NOME", "EMAIL", "NÍVEL DE ACESSO", "CADASTRADO EM", "AÇÕES"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-medium tracking-wide" style={{ color: "#475569" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.length > 0 ? usuariosFiltrados.map((usuario, i) => (
                <tr key={usuario.id} style={{ borderTop: "0.5px solid #e2e8f0", backgroundColor: i % 2 === 0 ? "white" : "#fafafa" }}>
                  <td className="px-5 py-3 font-medium" style={{ color: "#1a2744" }}>
                    {usuario.display_name || "—"}
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: "#64748b" }}>{usuario.email}</td>
                  <td className="px-5 py-3">
                    {editingId === usuario.id ? (
                      <select
                        value={editingRole}
                        onChange={(e) => setEditingRole(e.target.value as Role)}
                        className="rounded-lg border px-2 py-1 text-xs outline-none"
                        style={{ borderColor: "#cbd5e1", color: "#1e293b" }}
                      >
                        <option value="viewer">Apenas Leitura</option>
                        <option value="editor">Desenvolvedor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    ) : (
                      <span className="rounded px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: roleLabels[usuario.role]?.bg, color: roleLabels[usuario.role]?.text }}>
                        {roleLabels[usuario.role]?.label}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: "#94a3b8" }}>
                    {usuario.created_at ? new Date(usuario.created_at).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {editingId === usuario.id ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveRole(usuario.id)} disabled={saving}
                          className="rounded px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                          style={{ backgroundColor: "#1a2744" }}>
                          {saving ? "..." : "Salvar"}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="rounded px-2.5 py-1 text-xs font-medium border"
                          style={{ borderColor: "#cbd5e1", color: "#475569" }}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handleEditRole(usuario)}
                        className="rounded px-2.5 py-1 text-xs font-medium"
                        style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>
                        Editar Role
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm" style={{ color: "#94a3b8" }}>
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