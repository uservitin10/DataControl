"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type Mode = "login" | "register";
type Role = "viewer" | "editor" | "admin";

const roleLabels: Record<Role, string> = {
  viewer: "Apenas Leitura",
  editor: "Editor",
  admin: "Administrador",
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/dashboard");
      }
    };
    void checkSession();
  }, [router]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/dashboard");
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          role: role,
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setSuccess("Cadastro realizado! Verifique seu email para confirmar a conta.");
    setEmail("");
    setPassword("");
    setDisplayName("");
    setRole("viewer");
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError("");
    setSuccess("");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 to-slate-700 px-4">
      <section className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur">

        {/* Tabs */}
        <div className="mb-6 flex rounded-lg bg-white/10 p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
              mode === "login"
                ? "bg-white text-slate-900 shadow"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
              mode === "register"
                ? "bg-white text-slate-900 shadow"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Cadastrar
          </button>
        </div>

        {mode === "login" ? (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-white">Entrar</h1>
            <p className="mt-2 text-sm text-slate-200">
              Acesse sua conta para visualizar o dashboard.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm text-slate-200">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300/30 bg-white/90 px-3 py-2 text-slate-900 outline-none ring-sky-400 transition focus:ring-2"
                  placeholder="voce@exemplo.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm text-slate-200">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300/30 bg-white/90 px-3 py-2 text-slate-900 outline-none ring-sky-400 transition focus:ring-2"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-300/30 bg-red-500/20 p-2 text-sm text-red-100">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-sky-500 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-70"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-white">Cadastrar</h1>
            <p className="mt-2 text-sm text-slate-200">
              Crie sua conta para acessar o dashboard.
            </p>

            <form onSubmit={handleRegister} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-200">Nome</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300/30 bg-white/90 px-3 py-2 text-slate-900 outline-none ring-sky-400 transition focus:ring-2"
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-200">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300/30 bg-white/90 px-3 py-2 text-slate-900 outline-none ring-sky-400 transition focus:ring-2"
                  placeholder="voce@exemplo.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-200">Senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300/30 bg-white/90 px-3 py-2 text-slate-900 outline-none ring-sky-400 transition focus:ring-2"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-200">Categoria</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full rounded-lg border border-slate-300/30 bg-white/90 px-3 py-2 text-slate-900 outline-none ring-sky-400 transition focus:ring-2"
                >
                  {(Object.entries(roleLabels) as [Role, string][]).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="rounded-lg border border-red-300/30 bg-red-500/20 p-2 text-sm text-red-100">
                  {error}
                </p>
              )}

              {success && (
                <p className="rounded-lg border border-green-300/30 bg-green-500/20 p-2 text-sm text-green-100">
                  {success}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-sky-500 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-70"
              >
                {loading ? "Cadastrando..." : "Criar Conta"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}