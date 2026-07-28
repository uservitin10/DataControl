"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import PageHeader from "@/components/PageHeader";
import { useSession } from "next-auth/react";
import { fetchJson } from "@/lib/api";
import { deleteNotificacaoApi, fetchNotificacoesApi, markNotificacoesLidasApi } from "@/lib/notificacoes";
import type { Notificacao } from "@/types/dashboard";

type Role = "admin" | "editor" | "viewer" | "painel_editor" | "sistema_editor" | "inventario_editor";

type ProfileResponse = {
  success: boolean;
  data: {
    role: Role;
  };
};

export default function NotificacoesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notificacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      if (!session?.user?.id) {
        router.replace("/login");
        return;
      }

      try {
        const profile = await fetchJson<ProfileResponse>(`/api/profile/me`);

if (profile.data.role !== "admin") {
          router.replace("/dashboard");
          return;
        }

        setRole(profile.data.role);

        const notifications = await fetchNotificacoesApi();
        setNotificacoes(notifications ?? []);
      } catch (fetchError) {
        setError((fetchError as Error).message || "Não foi possível carregar as notificações.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [router, session]);

  const handleMarcarLidas = async () => {
    setSaving(true);
    setError(null);

    try {
      await markNotificacoesLidasApi();
      const notifications = await fetchNotificacoesApi();
      setNotificacoes(notifications ?? []);
    } catch (fetchError) {
      setError((fetchError as Error).message || "Não foi possível atualizar o status das notificações.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoverNotificacao = async (id: string) => {
    setDeletingId(id);
    setError(null);

    try {
      await deleteNotificacaoApi(id);
      const notifications = await fetchNotificacoesApi();
      setNotificacoes(notifications ?? []);

      if (selectedNotification?.id === id) {
        setSelectedNotification(null);
      }
    } catch (fetchError) {
      setError((fetchError as Error).message || "Não foi possível remover a notificação.");
    } finally {
      setDeletingId(null);
    }
  };

  const unreadCount = notificacoes.filter((item) => !item.lida).length;

  return (
    <main className="gov-page-bg min-h-screen">
      <nav className="gov-header px-6 py-4 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.65)] bg-gradient-to-r from-slate-950 via-slate-900/95 to-slate-950 border-b border-slate-800/20">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-4 rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
            aria-label="Voltar para o Dashboard"
          >
            <Logo className="h-10 w-auto hover-scale" width={40} height={40} alt="Horús" />
            <div>
              <h1 className="text-lg font-semibold text-white">Horús</h1>
              <p className="text-xs text-white/80">Painel de Notificações</p>
            </div>
          </Link>

          {role === "admin" && (
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="gov-button-secondary-dark inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
            >
              Voltar ao Dashboard
            </button>
          )}
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="gov-card rounded-3xl border border-slate-200/80 bg-white p-8 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.18)]">
          <PageHeader
            title={<>
              <p className="text-xs uppercase tracking-[0.24em] text-gov-muted">Notificações</p>
              <h1 className="mt-3 text-3xl font-bold text-gov-heading">Reclamações enviadas</h1>
            </>}
            subtitle="Apenas usuários com permissão de ADMIN podem ver e gerenciar essas mensagens."
            backHref="/dashboard"
            actions={
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleMarcarLidas}
                  disabled={saving || loading || unreadCount === 0}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Atualizando..." : `Marcar ${unreadCount} como lidas`}
                </button>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800">
                  {unreadCount} não lida{unreadCount === 1 ? "" : "s"}
                </span>
              </div>
            }
          />

          {error && (
            <div className="gov-status-error mb-6 rounded-xl border-l-4 p-4 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="gov-status-info rounded-3xl p-6 text-center text-sm text-slate-700">
              Carregando notificações...
            </div>
          ) : notificacoes.length === 0 ? (
            <div className="gov-status-success rounded-3xl p-6 text-center text-sm text-slate-700">
              Nenhuma reclamação registrada até o momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.24em] text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Mensagem</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {notificacoes.map((item) => (
                    <tr key={item.id} className={item.lida ? "bg-white" : "bg-slate-50"}>
                      <td className="px-4 py-4 align-top text-slate-700">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="px-4 py-4 align-top text-slate-700 font-semibold">{item.tipo}</td>
                      <td className="px-4 py-4 align-top text-slate-700 break-words max-w-2xl whitespace-pre-wrap">{item.mensagem}</td>
                      <td className="px-4 py-4 align-top">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.lida ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                          {item.lida ? "Lida" : "Não lida"}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedNotification(item)}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                          >
                            Visualizar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRemoverNotificacao(item.id)}
                            disabled={deletingId === item.id}
                            className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingId === item.id ? "Removendo..." : "Remover"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-3xl w-full rounded-xl bg-white p-6 shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-gov-muted">Detalhes da notificação</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{selectedNotification.tipo}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleRemoverNotificacao(selectedNotification.id)}
                  disabled={deletingId === selectedNotification.id}
                  className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingId === selectedNotification.id ? "Removendo..." : "Remover"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Recebida</p>
                <p className="mt-2 text-sm text-slate-900">
                  {selectedNotification.created_at
                    ? new Date(selectedNotification.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Status</p>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${selectedNotification.lida ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                  {selectedNotification.lida ? "Lida" : "Não lida"}
                </span>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-800 whitespace-pre-wrap">
              {selectedNotification.mensagem}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
