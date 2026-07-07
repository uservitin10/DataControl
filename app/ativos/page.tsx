import Link from "next/link";
import { Logo } from "@/components/Logo";
import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { listarAtivos } from "@/lib/queries/levantamento-ativos";
import { AtivosTable } from "./AtivosTable";

export const dynamic = "force-dynamic";

export default async function AtivosPage() {
  const supabase = await createClient();
  const ativos = await listarAtivos(supabase);

  return (
    <main className="gov-page-bg min-h-screen">
      <nav className="gov-header px-6 py-4 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.65)] bg-gradient-to-r from-slate-950 via-slate-900/95 to-slate-950 border-b border-slate-800/20">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-4 rounded-lg px-3 py-2 text-left transition hover:bg-white/10" aria-label="Ir para o Dashboard">
            <Logo className="h-10 w-auto hover-scale" width={40} height={40} alt="Horús" />
            <div>
              <h1 className="text-lg font-semibold text-white">Horús</h1>
              <p className="text-xs text-white/80">Portal de Gestão de Documentos</p>
            </div>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader
          title={<h1 className="text-3xl font-bold text-gov-heading">Levantamento de ativos</h1>}
          subtitle={`${ativos.length} ${ativos.length === 1 ? "ativo cadastrado" : "ativos cadastrados"}`}
          backHref="/levantamento"
          actions={
            <Link href="/ativos/novo" className="gov-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
              + Novo ativo
            </Link>
          }
        />

        <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.18)] sm:p-8">
          <AtivosTable ativos={ativos} />
        </div>
      </div>
    </main>
  );
}
