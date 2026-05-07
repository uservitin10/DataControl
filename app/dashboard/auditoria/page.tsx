"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";
import { Logo } from "@/src/components/Logo";
import { AuditLogs } from "@/src/components/dashboard/AuditLogs";
import type { Role } from "@/src/types/dashboard";

export default function AuditoriaPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user ?? null;

      if (!sessionUser) {
        router.replace("/login");
        return;
      }

      setUser(sessionUser);

      const profileRes = await fetch(`/api/profile?id=${encodeURIComponent(sessionUser.id)}`, {
        cache: "no-store",
      });
      if (!profileRes.ok) {
        router.replace("/dashboard");
        return;
      }

      const profileData = await profileRes.json();
      if (profileData?.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      setAuthorized(true);
      setLoading(false);
    };

    loadData();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="space-y-3 rounded-3xl bg-white px-8 py-10 shadow-soft">
          <div className="h-6 w-48 rounded-full bg-slate-200"></div>
          <div className="h-4 w-64 rounded-full bg-slate-200"></div>
          <div className="grid gap-4 pt-6">
            <div className="h-24 rounded-3xl bg-slate-200"></div>
            <div className="h-24 rounded-3xl bg-slate-200"></div>
          </div>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <nav className="px-6 py-4 shadow-soft" style={{ background: "linear-gradient(135deg, #1a2744 0%, #2d3a5c 100%)" }}>
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo className="h-10 w-auto hover-scale" width={40} height={40} alt="Data Control" />
            <div>
              <h1 className="text-lg font-semibold text-white">Data Control</h1>
              <p className="text-xs text-white/70">Sistema de Auditoria</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
              <span className="text-sm text-white/90">
                {user?.email}
              </span>
              <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-white/20 text-white">
                Admin
              </span>
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              ← Voltar ao Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* Conteúdo */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#1a2744" }}>
            Logs de Auditoria
          </h1>
          <p className="text-lg text-slate-600">
            Acompanhe todas as ações realizadas no sistema
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-soft p-6">
          <AuditLogs limit={200} />
        </div>
      </div>
    </main>
  );
}