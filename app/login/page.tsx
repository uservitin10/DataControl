"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/api";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/dashboard");
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

  const logAuthEvent = async (userId: string, action: string, details: string) => {
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

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      const msg = translateError(signInError.message);
      setError(msg);
      try {
        await logAuditEvent({
          user_id: null,
          action: "login_failed",
          resource_type: "auth",
          details: `email:${email} error:${signInError.message}`,
        });
      } catch (auditErr) {
        console.warn("Falha ao gravar tentativa de login falha:", auditErr);
      }
      return;
    }

    const userId = data.session?.user?.id || data.user?.id || null;
    if (userId) {
      await logAuthEvent(userId, "login", "Login via formulário");
    }

    router.push("/dashboard");
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName, role: "viewer" } },
    });
    setLoading(false);
    if (signUpError) {
      setError(translateError(signUpError.message));
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      await logAuthEvent(userId, "create_account", "Cadastro de novo usuário via formulário");
    }

    setSuccess("Cadastro realizado! Verifique seu email para confirmar a conta.");
    setEmail("");
    setPassword("");
    setDisplayName("");
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError("");
    setSuccess("");
  };

  return (
    <main className="gov-page-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gov-heading">
            Data Control
          </h1>
          <p className="mt-3 text-sm text-gov-muted">
            Acesse sua conta para gerenciar documentos e usuários em um portal confiável.
          </p>
        </div>

        <div className="gov-card p-8 border border-slate-200 bg-white shadow-soft">
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 shadow-inner">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`rounded-xl py-3 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-gov-primary text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`rounded-xl py-3 text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-gov-primary text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Cadastrar
            </button>
          </div>

          {mode === "login" ? (
            <>
              <p className="mb-1 text-xl font-semibold text-gov-heading">Bem-vindo</p>
              <p className="mb-6 text-sm text-gov-muted">Acesse sua conta para continuar</p>

              <form onSubmit={handleLogin} className="space-y-4">
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
                  type="submit"
                  disabled={loading}
                  className="gov-button w-full disabled:opacity-60"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/sistemas")}
                  className="gov-button-secondary mt-3 w-full"
                >
                  Acesso ao portal
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="mb-1 text-xl font-semibold text-gov-heading">Criar conta</p>
              <p className="mb-6 text-sm text-gov-muted">Preencha os dados para se cadastrar</p>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                    Nome
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="gov-input bg-white border-slate-300 text-slate-900"
                    placeholder="Seu nome completo"
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
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="gov-input bg-white border-slate-300 text-slate-900"
                    placeholder="••••••••"
                  />
                </div>
                <p className="text-sm text-gov-muted">
                  O cadastro será criado como usuário padrão. Roles de administrador devem ser definidas por um administrador.
                </p>

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
                  className="gov-button w-full disabled:opacity-60"
                >
                  {loading ? "Cadastrando..." : "Criar Conta"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
