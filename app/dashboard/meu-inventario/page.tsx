"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import { PersonalInventory } from "@/components/inventario/PersonalInventory";

export default function MeuInventarioPage() {
  const router = useRouter();
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user ?? null;

      if (!sessionUser) {
        router.replace("/login");
        return;
      }

      setLoadingUser(false);
    };

    void checkAccess();
  }, [router]);

  if (loadingUser) {
    return (
      <main className="gov-page-bg flex min-h-screen items-center justify-center">
        <p className="text-gov-muted">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="gov-page-bg min-h-screen">
      <nav className="gov-header px-6 py-4 shadow-soft">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-4 rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
            aria-label="Ir para o Dashboard"
          >
            <Logo className="h-10 w-auto hover-scale" width={40} height={40} alt="Data Control" />
            <div>
              <h1 className="text-lg font-semibold text-white">Data Control</h1>
              <p className="text-xs text-white/80">Portal de Gestão de Documentos</p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard/profile")}
              className="gov-button-secondary-dark rounded-lg px-3 py-2 text-sm font-medium"
            >
              Meu Perfil
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="gov-card rounded-3xl border border-slate-200 bg-white p-10 shadow-soft">
          <div className="mb-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 mb-4"
            >
              ← Voltar
            </Link>
            <h1 className="text-3xl font-bold text-gov-heading">Meu Inventário</h1>
            <p className="mt-2 text-base text-slate-600">
              Veja aqui os equipamentos e licenças alocados para você.
            </p>
          </div>

          <PersonalInventory />
        </div>
      </div>
    </main>
  );
}
