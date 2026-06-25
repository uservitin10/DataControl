"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AreasModulosManager from "@/components/admin/AreasModulosManager";
import { BackButton } from "@/components/BackButton";
import { fetchJson } from "@/lib/api";

export default function AdminAreasModulosPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPermissions() {
      try {
        const profile = await fetchJson<{ role: string }>("/api/profile");

        if (profile.role !== "admin") {
          router.push("/dashboard");
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error("Erro ao verificar permissões:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    checkPermissions();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex items-center justify-center">
        <p className="text-gray-500">Verificando permissões...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex items-center justify-center">
        <p className="text-red-600">Você não tem permissão para acessar esta página</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <BackButton href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 mb-4" />
      <AreasModulosManager />
    </div>
  );
}
