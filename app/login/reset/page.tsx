"use client";

import { Suspense, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchJson } from "@/lib/api";
import { isPasswordRecoveryRedirect } from "@/lib/auth-flow";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordFallback() {
  return (
    <main className="gov-page-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="gov-card p-8 border border-slate-200 bg-white shadow-soft text-center">
          <p className="text-sm text-gov-muted">Validando seu link de recuperação...</p>
        </div>
      </div>
    </main>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const isRecovery = useMemo(() => {
    const search = searchParams?.toString() ? `?${searchParams.toString()}` : "";
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    return isPasswordRecoveryRedirect(search, hash);
  }, [searchParams]);

  useEffect(() => {
    if (!isRecovery) {
      setError("Link inválido ou expirado. Solicite um novo envio de recuperação.");
      return;
    }

    const token = searchParams?.get("token") ?? null;

    if (!token) {
      setError("Token de recuperação não encontrado.");
      return;
    }

    setReady(true);
  }, [isRecovery, searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (!password || !confirmPassword) {
      setError("Informe e confirme sua nova senha.");
      return;
    }

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    const token = searchParams?.get("token") ?? null;

    if (!token) {
      setError("Token de recuperação não encontrado.");
      return;
    }

    setLoading(true);

    try {
      await fetchJson("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });

      setStatus("Senha redefinida com sucesso. Você já pode entrar com a nova senha.");
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => router.replace("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível redefinir a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="gov-page-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gov-heading">Criar nova senha</h1>
          <p className="mt-3 text-sm text-gov-muted">
            Defina uma nova senha para acessar o portal.
          </p>
        </div>

        <div className="gov-card p-8 border border-slate-200 bg-white shadow-soft">
          {!ready && !error ? (
            <p className="text-sm text-gov-muted">Validando seu link de recuperação...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                  Nova senha
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="gov-input bg-white border-slate-300 text-slate-900"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                  Confirmar nova senha
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="gov-input bg-white border-slate-300 text-slate-900"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="gov-status-error rounded-xl p-4 text-sm">{error}</div>
              )}

              {status && (
                <div className="gov-status-success rounded-xl p-4 text-sm">{status}</div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading || !ready}
                  className="gov-button-secondary-dark inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium gov-button-ghost w-full disabled:opacity-60"
                >
                  {loading ? "Salvando..." : "Salvar nova senha"}
                </button>

                <Link href="/login" className="gov-button-secondary-dark inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium gov-button-ghost w-full text-center">
                  Voltar
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
