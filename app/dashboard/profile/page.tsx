"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/api";

type Role = "admin" | "editor" | "viewer" | "painel_editor" | "sistema_editor" | "inventario_editor";

const roleLabel: Record<Role, string> = {
  admin: "Admin",
  editor: "Desenvolvedor",
  viewer: "Viewer",
  painel_editor: "Editor de Painel",
  sistema_editor: "Editor de Sistemas",
  inventario_editor: "Editor de Inventário",
};

const roleConfig: Record<Role, { label: string; color: string }> = {
  admin: { label: "Administrador", color: "bg-red-100 text-red-700" },
  editor: { label: "Desenvolvedor", color: "bg-blue-100 text-blue-700" },
  viewer: { label: "Apenas Leitura", color: "bg-slate-100 text-slate-600" },
  painel_editor: { label: "Editor de Painel", color: "bg-amber-100 text-amber-700" },
  sistema_editor: { label: "Editor de Sistemas", color: "bg-purple-100 text-purple-700" },
  inventario_editor: { label: "Editor de Inventário", color: "bg-emerald-100 text-emerald-700" },
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleLogout = async () => {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;

    if (userId) {
      try {
        await logAuditEvent({
          user_id: userId,
          action: "logout",
          resource_type: "auth",
          details: "Logout via botão de perfil",
        });
      } catch (auditError) {
        console.warn("Falha ao gravar log de auditoria de logout:", auditError);
      }
    }

    await supabase.auth.signOut();
    router.push("/login");
  };
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [displayName, setDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, display_name")
        .eq("id", user.id)
        .single();

      if (profile) {
        setRole(profile.role as Role);
        setDisplayName(profile.display_name ?? "");
      }

      setLoading(false);
    };

    void load();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "As senhas não coincidem." });
      setSaving(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;

    if (!userId) return;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", userId);

    if (profileError) {
      setMessage({ type: "error", text: profileError.message });
      setSaving(false);
      return;
    }

    const authUpdates: { email?: string; password?: string } = {};
    if (email) {
      authUpdates.email = email;
    }
    if (newPassword) {
      authUpdates.password = newPassword;
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabase.auth.updateUser(authUpdates);
      if (authError) {
        setMessage({ type: "error", text: authError.message });
        setSaving(false);
        return;
      }
    }

    setMessage({ type: "success", text: "Perfil atualizado com sucesso!" });
    setNewPassword("");
    setConfirmPassword("");
    setIsEditing(false);
    setSaving(false);
  };

  if (loading) {
    return (
      <main className="gov-page-bg flex min-h-screen items-center justify-center">
        <p className="text-gov-muted">Carregando perfil...</p>
      </main>
    );
  }

  const rc = (roleConfig as Record<string, { label: string; color: string }>)[role] ?? {
    label: (roleLabel as Record<string, string>)[role] ?? role,
    color: "bg-slate-100 text-slate-600",
  };
  const { label, color } = rc;

  return (
    <main className="gov-page-bg min-h-screen">
      <nav className="gov-header px-6 py-4 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.65)] bg-gradient-to-r from-slate-950 via-slate-900/95 to-slate-950 border-b border-slate-800/20">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-4 rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
            aria-label="Ir para o Dashboard"
          >
            <Logo className="h-10 w-auto hover-scale" width={40} height={40} alt="Data Control" />
            <div>
              <h1 className="text-lg font-semibold text-white">Data Control</h1>
              <p className="text-xs text-white/80">Portal de Gestão de Documentos</p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-sm ring-1 ring-white/10">
              <span className="text-sm text-white/90">{displayName || "Usuário"}</span>
              <span className="gov-badge rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white ring-1 ring-white/20">{(roleLabel as Record<string, string>)[role] ?? role}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="gov-button-secondary-dark rounded-2xl px-4 py-2 text-sm font-medium bg-white/10 shadow-lg shadow-slate-950/10 hover:bg-red-500/10"
            >
              Sair
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="gov-card overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.12)]">
          <div className="border-b border-slate-200/80 px-6 py-6">
            <h1 className="text-2xl font-bold text-gov-heading">Meu Perfil</h1>
            <p className="mt-1 text-sm text-gov-muted">Gerenciar informações da sua conta</p>
          </div>

          <div className="p-6">
            <div className="mb-6 flex flex-col items-center gap-4 border-b border-slate-200/80 pb-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gov-primary text-2xl font-bold text-white">
                {displayName ? displayName[0].toUpperCase() : email[0]?.toUpperCase()}
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gov-heading">{displayName || "Usuário"}</p>
                <p className="text-sm text-gov-muted">{email}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
                {label}
              </span>
            </div>

            {message && (
              <div className={`mb-4 rounded-xl p-3 text-sm ${
                message.type === "success"
                  ? "gov-status-success"
                  : "gov-status-error"
              }`}>
                {message.text}
              </div>
            )}

            {!isEditing ? (
              <div className="space-y-6">
                <div>
                  <p className="mb-1 text-sm font-medium text-gov-heading">Nome</p>
                  <p className="text-lg font-semibold text-gov-heading">{displayName || "Usuário"}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium text-gov-heading">Email</p>
                  <p className="text-sm text-slate-600">{email}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium text-gov-heading">Nível de Acesso</p>
                  <p className="text-sm text-slate-600">{label}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="gov-button mt-4 w-full"
                >
                  Editar Perfil
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gov-heading">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="gov-input"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gov-heading">Nome de Exibição</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Seu nome"
                    className="gov-input"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gov-heading">Nível de Acesso</label>
                  <input
                    type="text"
                    value={label}
                    disabled
                    className="gov-input bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>

                <hr className="border-slate-200/80" />

                <p className="text-sm font-medium text-gov-heading">
                  Trocar Senha <span className="text-gov-muted font-normal">(opcional)</span>
                </p>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gov-heading">Nova Senha</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="gov-input"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gov-heading">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="gov-input"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="gov-button mt-2 w-full disabled:opacity-50"
                  >
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="gov-button-secondary mt-2 w-full"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
