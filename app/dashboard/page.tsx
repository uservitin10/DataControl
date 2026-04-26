"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";

type Registro = {
  id?: number | string;
  [key: string]: string | number | boolean | null | undefined;
};

type Role = "admin" | "editor" | "viewer";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>("viewer");
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user ?? null;

      if (!sessionUser) {
        router.replace("/login");
        return;
      }

      setUser(sessionUser);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", sessionUser.id)
        .single();

      if (profileData?.role) {
        setRole(profileData.role as Role);
      }

      const { data, error: registrosError } = await supabase
        .from("registros")
        .select("*")
        .order("id", { ascending: true });

      if (registrosError) {
        setError(registrosError.message);
      } else {
        setRegistros((data ?? []) as Registro[]);
      }

      setLoading(false);
    };

    void loadData();
  }, [router]);

  const isAdmin = role === "admin";
  const isEditor = role === "editor";
  const canEdit = isAdmin || isEditor;
  const canDelete = isAdmin;

  const headers = useMemo(() => {
    if (!registros.length) return [];
    return Object.keys(registros[0]).filter((key) => key !== "id");
  }, [registros]);

  const handleDelete = async (id: Registro["id"]) => {
    if (!id) return;
    const { error: deleteError } = await supabase.from("registros").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setRegistros((current) => current.filter((registro) => registro.id !== id));
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-700">Carregando dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-6xl rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-600">
              {user?.email ? `${user.email}` : ""}{" "}
              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase text-slate-500">
                {role}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                + Novo Registro
              </button>
            )}
            {/* Botão Meu Perfil */}
            <button
              type="button"
              onClick={() => router.push("/dashboard/profile")}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Meu Perfil
            </button>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Sair
            </button>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                {headers.map((header) => (
                  <th key={header} className="px-4 py-3 font-semibold capitalize">
                    {header}
                  </th>
                ))}
                {canEdit && <th className="px-4 py-3 font-semibold">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {registros.length ? (
                registros.map((registro) => (
                  <tr key={String(registro.id ?? Math.random())} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-slate-600">{String(registro.id ?? "-")}</td>
                    {headers.map((header) => (
                      <td key={`${String(registro.id)}-${header}`} className="px-4 py-3 text-slate-700">
                        {String(registro[header] ?? "-")}
                      </td>
                    ))}
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-400"
                          >
                            Editar
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(registro.id)}
                              className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500"
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={headers.length + (canEdit ? 2 : 1)}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}