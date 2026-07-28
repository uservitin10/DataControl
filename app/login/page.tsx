"use client";

import Link from "next/link";
import { FormEvent, MouseEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { logAuditEvent } from "@/lib/api";
import { buildPasswordRecoveryRedirectPath, isPasswordRecoveryRedirect } from "@/lib/auth-flow";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      if (typeof window === "undefined") return;

      const isRecoveryUrl = isPasswordRecoveryRedirect(window.location.search, window.location.hash);
      if (isRecoveryUrl) {
        router.replace(buildPasswordRecoveryRedirectPath(window.location.search, window.location.hash));
        return;
      }

      const session = await getSession();
      if (session) router.replace("/dashboard");
    };
    void checkSession();
  }, [router]);

  const errorTranslator: Record<string, string> = {
    "Invalid login credentials": "Email ou senha incorretos.",
    "Email not confirmed": "Confirme seu email antes de entrar.",
    "User already registered": "Este email já está cadastrado.",
    "Password should be at least 6 characters": "A senha precisa ter pelo menos 6 caracteres.",
  };

  const translateError = (message: string) => errorTranslator[message] ?? message;

  const getErrorMessage = (err: unknown) => {
    if (!err) return "Ocorreu um erro inesperado.";
    if (typeof err === "string") return translateError(err === "{}" ? "Ocorreu um erro inesperado." : err);
    if (err instanceof Error && typeof err.message === "string") {
      return translateError(err.message === "{}" || !err.message.trim() ? "Ocorreu um erro inesperado." : err.message);
    }
    if (typeof err === "object" && err !== null) {
      const anyErr = err as { message?: unknown };
      if (anyErr.message && typeof anyErr.message === "string") {
        return translateError(anyErr.message === "{}" || !anyErr.message.trim() ? "Ocorreu um erro inesperado." : anyErr.message);
      }
      try {
        const s = JSON.stringify(err);
        if (s && s !== "{}") return s;
      } catch {
        // ignore
      }
    }
    return "Ocorreu um erro inesperado.";
  };

  const logAuthEvent = async (userId: string | null, action: string, details: string) => {
    try {
      await logAuditEvent({
        user_id: userId,
        action,
        resource_type: "auth",
        details,
      });
    } catch (auditError) {
      console.warn("Falha ao gravar log de auditoria:", auditError);
    }
  };

  const navigateToDashboard = () => {
    if (typeof window !== "undefined") {
      window.location.assign("/dashboard");
      return;
    }

    router.replace("/dashboard");
  };

  const handleLogin = async (event?: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Informe seu email e senha para continuar.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: normalizedEmail,
        password,
        redirect: false,
      });

      if (result?.error) {
        const msg = getErrorMessage(result.error);
        setError(msg);
        try {
          await logAuditEvent({
            user_id: null,
            action: "login_failed",
            resource_type: "auth",
            details: `email:${normalizedEmail} error:${JSON.stringify(result.error)}`,
          });
        } catch (auditErr) {
          console.warn("Falha ao gravar tentAtiva de login falha:", auditErr);
        }
        return;
      }

      await logAuthEvent(null, "login", "Login via formulário");
      navigateToDashboard();
    } finally {
      setLoading(false);
    }
  };


  return (
    <main className="gov-page-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gov-heading">
            Horús
          </h1>
          <p className="mt-3 text-sm text-gov-muted">
            Acesse sua conta para gerenciar documentos e usuários em um portal confiável.
          </p>
        </div>

        <div className="gov-card p-8 border border-slate-200 bg-white shadow-soft">
          <div className="mb-6 rounded-2xl bg-slate-100 p-4 text-center text-sm text-slate-700">
            Use suas credenciais para entrar no portal ou crie uma conta.
          </div>

          <>
              <p className="mb-1 text-xl font-semibold text-gov-heading">Bem-vindo</p>
              <p className="mb-6 text-sm text-gov-muted">Acesse sua conta para continuar</p>

              <form
                onSubmit={(event) => {
                  void handleLogin(event);
                }}
                className="space-y-4"
              >
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

                {error && (
                  <div className="gov-status-error rounded-xl p-4 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={(event) => {
                    void handleLogin(event);
                  }}
                  disabled={loading}
                  className="gov-button-secondary-dark inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium gov-button-ghost mb-2 text-xs font-medium w-full disabled:opacity-60"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="gov-button-secondary-dark inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium gov-button-ghost mb-2 text-xs font-medium w-full"
                >
                  Acesso ao portal
                </button>
                <div className="text-center text-sm text-slate-600 mb-4">
                  Ainda não tem conta?{' '}
                  <Link href="/register" className="text-gov-primary hover:underline">
                    Cadastre-se
                  </Link>
                </div>
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => router.push("/login/forgot")}
                    className="text-sm text-gov-primary hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              </form>
            </>
        </div>
      </div>
    </main>
  );
}
