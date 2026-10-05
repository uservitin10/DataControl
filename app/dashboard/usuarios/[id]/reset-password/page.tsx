"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Logo } from "@/components/Logo";
import UserBadge from "@/components/UserBadge";
import PageHeader from "@/components/PageHeader";
import { fetchJson } from "@/lib/api";

type TargetProfile = {
  id: string;
  email: string;
  display_name: string | null;
};

export default function AdminResetUserPasswordPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<TargetProfile | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.id) {
      router.replace("/login");
      return;
    }
    if (session.user.role !== "admin") {
      router.replace("/dashboard/usuarios");
      return;
    }

    const loadProfile = async () => {
      try {
        const response = await fetchJson<{ data: TargetProfile }>(
          `/api/usuarios/${encodeURIComponent(userId)}/reset-password`
        );
        setProfile(response.data);
      } catch (loadError) {
        setError((loadError as Error).message || "Não foi possível carregar o usuário.");
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [router, session?.user?.id, session?.user?.role, status, userId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setSaving(true);
    try {
      await fetchJson(`/api/usuarios/${encodeURIComponent(userId)}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setPassword("");
      setConfirmPassword("");
      setSuccess(`Senha redefinida para ${profile?.email}.`);
    } catch (saveError) {
      setError((saveError as Error).message || "Não foi possível redefinir a senha.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <main className="gov-page-bg flex min-h-screen items-center justify-center">
        <p className="text-gov-muted">Carregando usuário...</p>
      </main>
    );
  }

  return (
    <main className="gov-page-bg min-h-screen">
      <nav className="gov-header px-6 py-4 shadow-soft">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-4 rounded-lg px-3 py-2 text-left transition hover:bg-white/10" aria-label="Ir para o Dashboard">
            <Logo className="h-10 w-auto" width={40} height={40} alt="Horús" />
            <div>
              <h1 className="text-lg font-semibold text-white">Horús</h1>
              <p className="text-xs text-white/80">Portal de Gestão de Documentos</p>
            </div>
          </Link>
          <UserBadge />
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
          <PageHeader
            title="Definir nova senha"
            subtitle={profile ? `${profile.display_name || profile.email} · ${profile.email}` : "Usuário"}
            backHref="/dashboard/usuarios"
          />

          {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {success && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</div>}

          {profile && <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block text-sm font-medium text-slate-700">
              Nova senha
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Confirmar nova senha
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="gov-input mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>
            <p className="text-xs text-slate-500">Mínimo de 6 caracteres. A senha não será enviada por email.</p>
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <Link href="/dashboard/usuarios" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</Link>
              <button type="submit" disabled={saving} className="gov-button rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60">
                {saving ? "Salvando..." : "Salvar senha"}
              </button>
            </div>
          </form>}
        </div>
      </div>
    </main>
  );
}