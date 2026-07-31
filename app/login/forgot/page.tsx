"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { logAuditEvent } from "@/lib/api";
import { buildPasswordResetRedirectUrl } from "@/lib/auth-flow";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getStatusMessage = (error: unknown) => {
    if (!error) return "Erro ao enviar instruções de recuperação.";
    if (typeof error === "string") {
      return error === "{}" ? "Erro ao enviar instruções de recuperação." : error;
    }

    if (error instanceof Error && typeof error.message === "string") {
      return error.message === "{}" || !error.message.trim()
        ? "Erro ao enviar instruções de recuperação."
        : error.message;
    }

    if (typeof error === "object" && error !== null) {
      const objectError = error as { message?: unknown };
      if (objectError.message !== undefined) {
        if (typeof objectError.message === "string") {
          return objectError.message === "{}" || !objectError.message.trim()
            ? "Erro ao enviar instruções de recuperação."
            : objectError.message;
        }

        try {
          const nestedMessage = JSON.stringify(objectError.message);
          if (nestedMessage && nestedMessage !== "{}") return nestedMessage;
        } catch {
          // ignore
        }
      }

      try {
        const serialized = JSON.stringify(error);
        if (serialized && serialized !== "{}") return serialized;
      } catch {
        // ignore
      }
    }

    return "Erro ao enviar instruções de recuperação.";
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus(null);
    if (!email.trim()) {
      setStatus("Por favor, informe seu email.");
      return;
    }

    setLoading(true);
    try {
      const redirectTo = buildPasswordResetRedirectUrl(
        process.env.NEXT_PUBLIC_APP_URL,
        typeof window !== "undefined" ? window.location.origin : undefined
      );
      const response = await fetch("/api/auth/forgot-password", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, redirectTo }),
});
const result = await response.json().catch(() => null);

setLoading(false);
if (!response.ok) {
  const message = getStatusMessage(result?.error ?? result?.message);
  setStatus(message);
  console.warn("Password reset error:", result);
  return;
}

      setStatus("Se o email existe, enviamos instruções para recuperar a senha.");
      try {
        await logAuditEvent({
          user_id: null,
          action: "password_reset_requested",
          resource_type: "auth",
          details: `email:${email}`,
        });
      } catch (auditErr) {
        console.warn("Falha ao gravar log de auditoria:", auditErr);
      }
      setEmail("");
    } catch {
      setLoading(false);
      setStatus("Erro ao solicitar recuperação de senha.");
    }
  };

  return (
    <main className="gov-page-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gov-heading">Recuperar senha</h1>
          <p className="mt-3 text-sm text-gov-muted">Informe seu email para receber instruções de recuperação.</p>
        </div>

        <div className="gov-card p-8 border border-slate-200 bg-white shadow-soft">
          <form onSubmit={handleSubmit} className="space-y-4">
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

            {status && (
              <div className="gov-status-success rounded-xl p-4 text-sm">{status}</div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="gov-button-secondary-dark inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium gov-button-ghost w-full disabled:opacity-60"
              >
                {loading ? "Enviando..." : "Enviar instruções"}
              </button>

              <Link href="/login" className="gov-button-secondary-dark inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium gov-button-ghost w-full text-center">
                Voltar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
