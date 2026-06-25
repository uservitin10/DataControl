"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { BackButton } from "@/components/BackButton";
import { PainelRespostas } from "@/components/levantamento/PainelRespostas";

export default function LevantamentoPage() {
  return (
    <main className="gov-page-bg min-h-screen">
      <nav className="gov-header px-6 py-4 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.65)] bg-gradient-to-r from-slate-950 via-slate-900/95 to-slate-950 border-b border-slate-800/20">
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

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/profile"
              className="gov-button-secondary-dark inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium gov-button-ghost mb-2 text-xs font-medium"
            >
              Meu Perfil
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-12">
          <BackButton href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 mb-4" />
          <h1 className="text-4xl font-bold text-[#1a202c] mb-2">Levantamento de Ativos de Dados</h1>
          <p className="text-lg text-[#718096] max-w-2xl">
            Aqui estão todas as respostas recebidas do formulário existente no Microsoft Forms. Este espaço exibe os
            dados importados e não contém formulário nativo no Horús.
          </p>
        </div>

        <div className="rounded-xl border border-[#e2e8f0] bg-white p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#1a202c] mb-2">Respostas importadas</h2>
            <p className="text-[#718096]">
              Visualize todas as respostas trazidas do Microsoft Forms. Essas informações são usadas para análise de
              ativos de dados e governança da informação.
            </p>
          </div>
          <PainelRespostas />
        </div>
      </div>
    </main>
  );
}
