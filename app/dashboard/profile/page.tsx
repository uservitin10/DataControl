"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type Role = "admin" | "desenvolvedor" | "viewer";

const roleConfig = {
  admin: { label: "Administrador", color: "bg-red-100 text-red-700" },
  desenvolvedor: { label: "Desenvolvedor", color: "bg-blue-100 text-blue-700" },
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
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-700">Carregando perfil...</p>
      </main>
    );
  }

  const { label, color } = roleConfig[role];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Meu Perfil</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              ← Voltar
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="rounded-lg bg-rose-500 px-3 py-2 text-sm font-medium text-white hover:bg-rose-600"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Avatar placeholder */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-3xl font-bold text-slate-500">
            {displayName ? displayName[0].toUpperCase() : email[0]?.toUpperCase()}
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
          className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>
    </main>
  );
}