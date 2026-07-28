"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";
import { postJson } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      if (typeof window === "undefined") return;
      const session = await getSession();
      if (session) {
        router.replace("/dashboard");
      }
    };

    void checkSession();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim() || !password || !confirmPassword) {
      setError("Preencha todos os campos para continuar.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      await postJson<{ success: true }>("/api/auth/register", {
        email: email.trim().toLowerCase(),
        displayName: displayName.trim(),
        password,
      });

      setSuccess("Cadastro realizado com sucesso. Faça login para continuar.");
      setEmail("");
      setDisplayName("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError((err as Error).message || "Falha ao criar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="gov-page-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gov-heading">Cadastro</h1>
          <p className="mt-3 text-sm text-gov-muted">
            Crie sua conta para acessar o portal de gestão de documentos.
          </p>
        </div>

        <div className="gov-card p-8 border border-slate-200 bg-white shadow-soft">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                Nome exibido
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="gov-input bg-white border-slate-300 text-slate-900"
                placeholder="Seu nome"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="gov-input bg-white border-slate-300 text-slate-900"
                placeholder="voce@empresa.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="gov-input bg-white border-slate-300 text-slate-900"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                Confirme a senha
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="gov-input bg-white border-slate-300 text-slate-900"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="gov-status-error rounded-xl p-4 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="gov-status-success rounded-xl p-4 text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="gov-button-secondary-dark inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {loading ? "Criando conta..." : "Criar conta"}
            </button>

            <div className="text-center text-sm text-slate-600">
              Já tem conta?{' '}
              <Link href="/login" className="text-gov-primary hover:underline">
                Entrar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
