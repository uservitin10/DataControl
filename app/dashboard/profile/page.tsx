"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/src/components/Logo";
import { supabase } from "@/src/lib/supabase";

type Role = "admin" | "editor" | "viewer";

const roleLabel = {
  admin: "Admin",
  editor: "Desenvolvedor",
  viewer: "Viewer",
};

const roleConfig = {
  admin: { label: "Administrador", color: "bg-red-100 text-red-700" },
  editor: { label: "Desenvolvedor", color: "bg-blue-100 text-blue-700" },
  viewer: { label: "Apenas Leitura", color: "bg-slate-100 text-slate-600" },
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

    if (newPassword) {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (passwordError) {
        setMessage({ type: "error", text: passwordError.message });
        setSaving(false);
        return;
      }
    }

    setMessage({ type: "success", text: "Perfil atualizado com sucesso!" });
    setNewPassword("");
    setConfirmPassword("");
    setSaving(false);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
        <p style={{ color: "#64748b" }}>Carregando perfil...</p>
      </main>
    );
  }

  const { label, color } = roleConfig[role];

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      <nav className="px-6 py-4 shadow-soft" style={{ background: "linear-gradient(135deg, #1a2744 0%, #2d3a5c 100%)" }}>
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Logo className="h-10 w-auto hover-scale" width={40} height={40} alt="Data Control" />
            <div>
              <h1 className="text-lg font-semibold text-white">Data Control</h1>
              <p className="text-xs text-white/70">Portal de Gestão de Documentos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
              <span className="text-sm text-white/90">{displayName || "Usuário"}</span>
              <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-white/20 text-white">
                {roleLabel[role]}
              </span>
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              Painéis
            </button>

            <button
              type="button"
              onClick={() => router.push("/sistemas")}
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              Sistemas
            </button>

            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-red-500/20 transition-all duration-200"
            >
              Sair
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "#e2e8f0" }}>
          {/* Header */}
          <div className="border-b px-6 py-6" style={{ borderColor: "#e2e8f0" }}>
            <h1 className="text-2xl font-bold" style={{ color: "#1a2744" }}>
              Meu Perfil
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Gerenciar informações da sua conta
            </p>
          </div>

          <div className="p-6">
            {/* Avatar e Informações */}
            <div className="mb-6 flex flex-col items-center gap-4 pb-6 border-b" style={{ borderColor: "#e2e8f0" }}>
              <div className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white" style={{ backgroundColor: "#3b82f6" }}>
                {displayName ? displayName[0].toUpperCase() : email[0]?.toUpperCase()}
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold" style={{ color: "#1a2744" }}>
                  {displayName || "Usuário"}
                </p>
                <p className="text-sm text-slate-600">{email}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
                {label}
              </span>
            </div>

            {/* Mensagem de feedback */}
            {message && (
              <p className={`mb-4 rounded-lg p-3 text-sm ${
                message.type === "success"
                  ? "border border-green-200 bg-green-50 text-green-700"
                  : "border border-red-200 bg-red-50 text-red-700"
              }`}>
                {message.text}
              </p>
            )}

            {/* Campos */}
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nome de Exibição</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nível de Acesso</label>
                <input
                  type="text"
                  value={label}
                  disabled
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>

              <hr className="border-slate-200" />

              <p className="text-sm font-medium text-slate-700">Trocar Senha <span className="text-slate-400 font-normal">(opcional)</span></p>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nova Senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-6 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#3b82f6" }}
            >
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}