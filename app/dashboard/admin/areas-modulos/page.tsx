"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AreasModulosManager from "@/components/admin/AreasModulosManager";
import PageHeader from "@/components/PageHeader";
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
      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader title={<h1 className="text-2xl font-bold text-gov-heading">Áreas e Módulos</h1>} subtitle={"Gerenciar áreas e módulos do sistema"} backHref="/dashboard" />
        <AreasModulosManager />
      </div>
    </div>
  );
}
