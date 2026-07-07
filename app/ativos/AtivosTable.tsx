"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { LevantamentoAtivo } from "@/types/levantamento-ativos";
import { excluirAtivoAction } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  em_uso: "Em uso",
  legado: "Legado",
  em_desenvolvimento: "Em desenvolvimento",
};

const STATUS_BADGE: Record<string, string> = {
  em_uso: "bg-emerald-100 text-emerald-700",
  legado: "bg-slate-200 text-slate-600",
  em_desenvolvimento: "bg-amber-100 text-amber-700",
};

export function AtivosTable({ ativos }: { ativos: LevantamentoAtivo[] }) {
  const [busca, setBusca] = useState("");
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const ativosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return ativos;

    return ativos.filter((a) =>
      [a.nome_ativo, a.sigla, a.finalidade]
        .filter(Boolean)
        .some((campo) => campo!.toLowerCase().includes(termo))
    );
  }, [ativos, busca]);

  function confirmarExclusao(id: string, nome: string) {
    if (!window.confirm(`Excluir o ativo "${nome}"? Essa ação não pode ser desfeita.`)) {
      return;
    }

    setExcluindoId(id);
    startTransition(async () => {
      await excluirAtivoAction(id);
      setExcluindoId(null);
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <input
          type="text"
          placeholder="Buscar por nome, sigla ou finalidade..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </div>

      {ativosFiltrados.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-500">
          Nenhum ativo encontrado.
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Sigla</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Nível de acesso</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ativosFiltrados.map((ativo) => (
              <tr key={ativo.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {ativo.nome_ativo}
                </td>
                <td className="px-4 py-3 text-slate-600">{ativo.sigla || "—"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {ativo.tipo_ativo || "—"}
                </td>
                <td className="px-4 py-3">
                  {ativo.status_ativo ? (
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        STATUS_BADGE[ativo.status_ativo] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {STATUS_LABEL[ativo.status_ativo] ?? ativo.status_ativo}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {ativo.nivel_acesso || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/ativos/${ativo.id}/editar`}
                      className="text-sm font-medium text-slate-700 hover:underline"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => confirmarExclusao(ativo.id, ativo.nome_ativo)}
                      disabled={isPending && excluindoId === ativo.id}
                      className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      {isPending && excluindoId === ativo.id ? "Excluindo..." : "Excluir"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
