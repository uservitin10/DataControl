"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api";
import type { RespostaLevantamento, EstatisticasLevantamento } from "@/types/levantamento";

type PainelRespostasProps = {
  onAbrirDetalhes?: (id: string) => void;
};

const criticidadeConfig = {
  critica: { bg: "bg-red-100", text: "text-red-700", label: "Crítica" },
  alta: { bg: "bg-amber-100", text: "text-amber-700", label: "Alta" },
  media: { bg: "bg-blue-100", text: "text-blue-700", label: "Média" },
  baixa: { bg: "bg-green-100", text: "text-green-700", label: "Baixa" },
};

const statusConfig = {
  concluido: { bg: "bg-green-100", text: "text-green-700", label: "Concluído" },
  rascunho: { bg: "bg-amber-100", text: "text-amber-700", label: "Rascunho" },
  pendente: { bg: "bg-gray-100", text: "text-gray-700", label: "Pendente" },
};

export function PainelRespostas({ onAbrirDetalhes }: PainelRespostasProps) {
  const [respostas, setRespostas] = useState<RespostaLevantamento[]>([]);
  const [stats, setStats] = useState<EstatisticasLevantamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoading(true);
        const [respostasData, statsData] = await Promise.all([
          fetchJson<RespostaLevantamento[]>("/api/levantamento"),
          fetchJson<EstatisticasLevantamento>("/api/levantamento?stats=true"),
        ]);

        setRespostas(respostasData);
        setStats(statsData);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    void carregarDados();
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">Erro ao carregar dados: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-[#f7f9fb] p-6">
          <p className="text-xs uppercase tracking-widest text-[#a0aec0] font-medium">Respostas recebidas</p>
          <p className="mt-3 text-3xl font-bold text-[#2d4a6b]">
            {loading ? "-" : stats?.total_respostas ?? 0}
          </p>
          {!loading && stats && (
            <p className="mt-2 text-xs text-[#718096]">
              {stats.concluidos} concluídas, {stats.rascunhos} em rascunho
            </p>
          )}
        </div>

        <div className="rounded-xl bg-[#f7f9fb] p-6">
          <p className="text-xs uppercase tracking-widest text-[#a0aec0] font-medium">Setores respondentes</p>
          <p className="mt-3 text-3xl font-bold text-[#2d4a6b]">
            {loading ? "-" : stats?.setores_respondentes ?? 0}
          </p>
          {!loading && stats && (
            <p className="mt-2 text-xs text-[#718096]">de diferentes secretarias</p>
          )}
        </div>

        <div className="rounded-xl bg-[#f7f9fb] p-6">
          <p className="text-xs uppercase tracking-widest text-[#a0aec0] font-medium">Aguardando resposta</p>
          <p className="mt-3 text-3xl font-bold text-[#2d4a6b]">
            {loading ? "-" : stats?.pendentes ?? 0}
          </p>
          {!loading && stats && (
            <p className="mt-2 text-xs text-[#718096]">pendentes</p>
          )}
        </div>
      </div>

      {/* Tabela de respostas */}
      <div className="rounded-xl border border-[#e2e8f0] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d4a6b]" />
              <p className="mt-3 text-sm text-[#718096]">Carregando respostas...</p>
            </div>
          ) : respostas.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-[#718096]">Nenhuma resposta recebida ainda</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-[#f7f9fb]">
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-widest text-[#a0aec0] font-medium">
                    Respondente
                  </th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-widest text-[#a0aec0] font-medium">
                    Secretaria
                  </th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-widest text-[#a0aec0] font-medium">
                    Ativo de dados
                  </th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-widest text-[#a0aec0] font-medium">
                    Criticidade
                  </th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-widest text-[#a0aec0] font-medium">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-xs uppercase tracking-widest text-[#a0aec0] font-medium">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody>
                {respostas.map((resposta) => {
                  const criticidade = criticidadeConfig[resposta.nivel_criticidade];
                  const status = statusConfig[resposta.status];

                  return (
                    <tr key={resposta.id} className="border-b border-[#e2e8f0] hover:bg-[#f7f9fb] transition">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-[#1a202c]">{resposta.nome_respondente}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#718096]">{resposta.secretaria}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#1a202c]">{resposta.nome_ativo}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-medium ${criticidade.bg} ${criticidade.text}`}>
                          {criticidade.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => onAbrirDetalhes?.(resposta.id)}
                          className="text-[#2d4a6b] hover:text-[#243d5a] text-sm font-medium transition"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
