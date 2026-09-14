"use client";

import { useEffect, useState } from "react";

interface AnalysisData {
  dbTotal: number;
  jsonTotal: number;
  uniqueKeysInDB: number;
  uniqueKeysInJSON: number;
  onlyInDB: ComparisonEntry[];
  onlyInJSON: ComparisonEntry[];
  duplicatesInDB: ComparisonEntry[];
  duplicatesInJSON: ComparisonEntry[];
  inBothWithDifferences: DifferenceEntry[];
}

type ComparisonEntry = {
  key: string;
  count?: number;
  items: Array<{ model?: string | null; sector?: string | null }>;
};

type DifferenceEntry = {
  key: string;
  differences: string[];
};

export default function InventoryComparison() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetch("/api/inventario/compare-with-db")
      .then((res) => res.json())
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8">Carregando relatório...</div>;
  if (!data) return <div className="p-8">Erro ao carregar dados</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">
          📊 Análise de Discrepâncias de Inventário
        </h1>
        <p className="text-slate-600 mb-8">
          Comparação entre Banco de Dados e Arquivo JSON Local
        </p>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="text-sm text-slate-600 uppercase tracking-wide font-semibold">
              Total no Banco
            </div>
            <div className="text-3xl font-bold text-blue-600 mt-2">
              {data.dbTotal}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-amber-500">
            <div className="text-sm text-slate-600 uppercase tracking-wide font-semibold">
              Total no JSON
            </div>
            <div className="text-3xl font-bold text-amber-600 mt-2">
              {data.jsonTotal}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <div className="text-sm text-slate-600 uppercase tracking-wide font-semibold">
              Chaves Duplicadas
            </div>
            <div className="text-3xl font-bold text-red-600 mt-2">
              {data.duplicatesInDB.length + data.duplicatesInJSON.length}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div className="text-sm text-slate-600 uppercase tracking-wide font-semibold">
              Com Diferenças
            </div>
            <div className="text-3xl font-bold text-orange-600 mt-2">
              {data.inBothWithDifferences.length}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-slate-200 flex flex-wrap">
            {[
              { id: "overview", label: "📋 Visão Geral" },
              { id: "onlyDb", label: "✅ Apenas no Banco" },
              { id: "onlyJson", label: "📝 Apenas no JSON" },
              { id: "duplicates", label: "🔄 Duplicatas" },
              { id: "differences", label: "⚠️ Diferenças" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600 bg-blue-50"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Chaves Únicas
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm text-slate-600">Banco</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {data.uniqueKeysInDB}
                      </div>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-lg">
                      <div className="text-sm text-slate-600">JSON</div>
                      <div className="text-2xl font-bold text-amber-600">
                        {data.uniqueKeysInJSON}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Status de Sincronização
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-center text-sm">
                      <span className="text-green-500 mr-3">✓</span>
                      <span className="text-slate-700">
                        <strong>{data.onlyInDB.length}</strong> chaves apenas
                        no Banco (novos equipamentos)
                      </span>
                    </li>
                    <li className="flex items-center text-sm">
                      <span className="text-orange-500 mr-3">⚠</span>
                      <span className="text-slate-700">
                        <strong>{data.onlyInJSON.length}</strong> chaves
                        apenas no JSON (desatualizadas)
                      </span>
                    </li>
                    <li className="flex items-center text-sm">
                      <span className="text-red-500 mr-3">✕</span>
                      <span className="text-slate-700">
                        <strong>{data.duplicatesInDB.length}</strong> duplicatas
                        no Banco
                      </span>
                    </li>
                    <li className="flex items-center text-sm">
                      <span className="text-red-500 mr-3">✕</span>
                      <span className="text-slate-700">
                        <strong>{data.duplicatesInJSON.length}</strong>{" "}
                        duplicatas no JSON
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "onlyDb" && (
              <div>
                <p className="text-sm text-slate-600 mb-4">
                  {data.onlyInDB.length} equipamentos estão no Banco mas não
                  foram sincronizados ao JSON
                </p>
                <div className="space-y-4">
                  {data.onlyInDB.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 p-4 rounded-lg border border-slate-200"
                    >
                      <div className="font-mono text-xs bg-white p-2 rounded mb-2 text-slate-700 break-all">
                        {item.key}
                      </div>
                      <div className="text-xs text-slate-600">
                        {item.items[0].model} • {item.items[0].sector || "Sem Setor"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "onlyJson" && (
              <div>
                <p className="text-sm text-slate-600 mb-4">
                  {data.onlyInJSON.length} equipamentos estão no JSON mas não
                  existem no Banco (desatualizados ou removidos)
                </p>
                <div className="space-y-4">
                  {data.onlyInJSON.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 p-4 rounded-lg border border-slate-200"
                    >
                      <div className="font-mono text-xs bg-white p-2 rounded mb-2 text-slate-700 break-all">
                        {item.key}
                      </div>
                      <div className="text-xs text-slate-600">
                        {item.items[0].model} • {item.items[0].sector || "Sem Setor"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "duplicates" && (
              <div>
                <div className="mb-8">
                  <h4 className="font-semibold text-slate-900 mb-3">
                    Duplicatas no Banco ({data.duplicatesInDB.length})
                  </h4>
                  <div className="space-y-3">
                    {data.duplicatesInDB.slice(0, 10).map((dup, idx) => (
                      <div
                        key={idx}
                        className="bg-red-50 p-4 rounded-lg border border-red-200"
                      >
                        <div className="font-mono text-xs bg-white p-2 rounded mb-2 text-slate-700 break-all">
                          {dup.key}
                        </div>
                        <div className="text-xs text-slate-600">
                          {dup.count} ocorrências
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">
                    Duplicatas no JSON ({data.duplicatesInJSON.length})
                  </h4>
                  <div className="space-y-3">
                    {data.duplicatesInJSON.slice(0, 10).map((dup, idx) => (
                      <div
                        key={idx}
                        className="bg-orange-50 p-4 rounded-lg border border-orange-200"
                      >
                        <div className="font-mono text-xs bg-white p-2 rounded mb-2 text-slate-700 break-all">
                          {dup.key}
                        </div>
                        <div className="text-xs text-slate-600">
                          {dup.count} ocorrências
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "differences" && (
              <div>
                <p className="text-sm text-slate-600 mb-4">
                  {data.inBothWithDifferences.length} equipamentos existem em
                  ambos mas com dados diferentes
                </p>
                <div className="space-y-4">
                  {data.inBothWithDifferences.slice(0, 10).map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 p-4 rounded-lg border border-slate-200"
                    >
                      <div className="font-mono text-xs bg-white p-2 rounded mb-3 text-slate-700 break-all">
                        {item.key}
                      </div>
                      <div className="text-xs">
                        <div className="font-semibold text-slate-700 mb-2">
                          Campos diferentes:
                        </div>
                        <ul className="space-y-1">
                          {item.differences.map((field: string) => (
                            <li key={field} className="text-slate-600">
                              • <strong>{field}</strong>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
