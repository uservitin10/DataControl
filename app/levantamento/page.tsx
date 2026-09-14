import Link from "next/link";
import { Logo } from "@/components/Logo";
import PageHeader from "@/components/PageHeader";

import { listarAtivos } from "@/lib/queries/levantamento-ativos";
import { AtivosTable } from "../ativos/AtivosTable";

export const dynamic = "force-dynamic";

export default async function LevantamentoPage() {
  const ativos = await listarAtivos();

  return (
    <main className="gov-page-bg min-h-screen">
      <nav className="gov-header px-6 py-4 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.65)] bg-gradient-to-r from-slate-950 via-slate-900/95 to-slate-950 border-b border-slate-800/20">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
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
              href="/login"
              className="gov-button-secondary-dark inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader
          title={<h1 className="text-3xl font-bold text-gov-heading">Levantamento de ativos</h1>}
          subtitle="Cadastre, consulte e mantenha os ativos do levantamento em um único lugar."
          backHref="/dashboard"
          actions={
            <Link
              href="/ativos/novo"
              className="gov-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
            >
              + Novo ativo
            </Link>
          }
        />

        <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.18)] sm:p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gov-muted">
              Gestão de ativos
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Visualize os ativos cadastrados e adicione novos registros diretamente nesta página.
            </p>
          </div>

          <AtivosTable ativos={ativos} />
        </div>
      </div>
    </main>
  );
}
