"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/src/components/Logo";
import { supabase } from "@/src/lib/supabase";

type Mode = "login" | "register";
type Role = "viewer" | "desenvolvedor";

const roleLabels: Record<Role, string> = {
  viewer: "Apenas Leitura",
  desenvolvedor: "Desenvolvedor",
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
      if (data.session) router.replace("/dashboard");
    };
    void checkSession();
  }, [router]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) { setError(signInError.message); return; }
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
      options: { data: { display_name: displayName, role } },
    });
    setLoading(false);
    if (signUpError) { setError(signUpError.message); return; }
    setSuccess("Cadastro realizado! Verifique seu email para confirmar a conta.");
    setEmail(""); setPassword(""); setDisplayName(""); setRole("viewer");
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError("");
    setSuccess("");
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: "#1a2744" }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="mb-6">
          <Logo width={48} height={48} alt="Data Control" />
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-2xl">

          {/* Tabs */}
          <div className="mb-6 flex rounded-lg p-1" style={{ backgroundColor: "#f1f5f9" }}>
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="flex-1 rounded-md py-2 text-sm font-medium transition"
              style={mode === "login" ? { backgroundColor: "#1a2744", color: "white" } : { color: "#64748b" }}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className="flex-1 rounded-md py-2 text-sm font-medium transition"
              style={mode === "register" ? { backgroundColor: "#1a2744", color: "white" } : { color: "#64748b" }}
            >
              Cadastrar
            </button>
          </div>

          {mode === "login" ? (
            <>
              <p className="mb-1 text-xl font-medium" style={{ color: "#1a2744" }}>Bem-vindo</p>
              <p className="mb-6 text-sm" style={{ color: "#64748b" }}>Acesse sua conta para continuar</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: "#475569" }}>Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2"
                    style={{ borderColor: "#cbd5e1", color: "#1e293b" }}
                    placeholder="voce@empresa.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: "#475569" }}>Senha</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2"
                    style={{ borderColor: "#cbd5e1", color: "#1e293b" }}
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <p className="rounded-lg border p-2.5 text-sm" style={{ borderColor: "#fecaca", backgroundColor: "#fef2f2", color: "#dc2626" }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: "#1a2744" }}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="mb-1 text-xl font-medium" style={{ color: "#1a2744" }}>Criar conta</p>
              <p className="mb-6 text-sm" style={{ color: "#64748b" }}>Preencha os dados para se cadastrar</p>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: "#475569" }}>Nome</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition"
                    style={{ borderColor: "#cbd5e1", color: "#1e293b" }}
                    placeholder="Seu nome completo"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: "#475569" }}>Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition"
                    style={{ borderColor: "#cbd5e1", color: "#1e293b" }}
                    placeholder="voce@empresa.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: "#475569" }}>Senha</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition"
                    style={{ borderColor: "#cbd5e1", color: "#1e293b" }}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: "#475569" }}>Nível de acesso</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition"
                    style={{ borderColor: "#cbd5e1", color: "#1e293b" }}
                  >
                    {(Object.entries(roleLabels) as [Role, string][]).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {error && (
                  <p className="rounded-lg border p-2.5 text-sm" style={{ borderColor: "#fecaca", backgroundColor: "#fef2f2", color: "#dc2626" }}>
                    {error}
                  </p>
                )}
                {success && (
                  <p className="rounded-lg border p-2.5 text-sm" style={{ borderColor: "#bbf7d0", backgroundColor: "#f0fdf4", color: "#16a34a" }}>
                    {success}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: "#1a2744" }}
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