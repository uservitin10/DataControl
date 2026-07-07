"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Logo } from "@/components/Logo";
import PageHeader from "@/components/PageHeader";
import { postJson } from "@/lib/api";

export default function ReclameAquiPage() {
  const [mensagem, setMensagem] = useState("");
  const [identificacao, setIdentificacao] = useState("");
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitStatus(null);

    if (!mensagem.trim()) {
      setSubmitStatus("Por favor, descreva a sua reclamação.");
      return;
    }

    setSubmitting(true);

    try {
      await postJson("/api/reclame-aqui", {
        tipo: "Reclame aqui",
        identificacao: identificacao.trim(),
        mensagem: mensagem.trim(),
      });
      setMensagem("");
      setIdentificacao("");
      setSubmitStatus("Reclamação enviada com sucesso.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao enviar sua reclamação.";
      setSubmitStatus(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="gov-page-bg min-h-screen">
      <nav className="gov-header px-6 py-4 shadow-soft">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-4 rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
            aria-label="Ir para o Dashboard"
          >
            <Logo className="h-10 w-auto hover-scale" width={40} height={40} alt="Horús" />
            <div>
              <h1 className="text-lg font-semibold text-white">Horús</h1>
              <p className="text-xs text-white/80">Portal de Gestão de Documentos</p>
            </div>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="gov-card rounded-3xl border border-slate-200 bg-white p-10 shadow-soft">
          <PageHeader
            title={<h1 className="text-3xl font-bold text-gov-heading">Reclame aqui</h1>}
            subtitle="Envie sua reclamação diretamente ao time responsável."
            backHref="/dashboard"
          />

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="identificacao" className="block text-sm font-semibold text-slate-700">
                Identificação (opcional)
              </label>
              <input
                id="identificacao"
                name="identificacao"
                type="text"
                value={identificacao}
                onChange={(e) => setIdentificacao(e.target.value)}
                className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                placeholder="Nome ou e-mail (opcional)"
              />
            </div>
            <div>
              <label htmlFor="mensagem" className="block text-sm font-semibold text-slate-700">
                Reclamação
              </label>
              <textarea
                id="mensagem"
                name="mensagem"
                rows={8}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                placeholder="Descreva aqui o problema, sugestão ou checklist que você deseja relatar."
                required
              />
            </div>

            {submitStatus && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {submitStatus}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="gov-button inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold"
            >
              {submitting ? "Enviando..." : "Enviar reclamação"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
