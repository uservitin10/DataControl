import { useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { SECRETARIAS } from "@/lib/dashboard";

type SistemasFiltersProps = {
  busca: string;
  setBusca: Dispatch<SetStateAction<string>>;
  filtroAmbiente: "producao" | "homologacao" | "ambos";
  setFiltroAmbiente: Dispatch<SetStateAction<"producao" | "homologacao" | "ambos">>;
  filtroHomologados: boolean;
  setFiltroHomologados: Dispatch<SetStateAction<boolean>>;
  filtroAcessiveis: boolean;
  setFiltroAcessiveis: Dispatch<SetStateAction<boolean>>;
  filtroTipoAcesso: "" | "publico" | "restrito";
  setFiltroTipoAcesso: Dispatch<SetStateAction<"" | "publico" | "restrito">>;
  filtroSecretaria: string;
  setFiltroSecretaria: Dispatch<SetStateAction<string>>;
  temFiltroAtivo: boolean;
  onClear: () => void;
  mostrarHomologadosProducao?: boolean;
};

export function SistemasFilters({
  busca,
  setBusca,
  filtroAmbiente,
  setFiltroAmbiente,
  filtroHomologados,
  setFiltroHomologados,
  filtroAcessiveis,
  setFiltroAcessiveis,
  filtroTipoAcesso,
  setFiltroTipoAcesso,
  filtroSecretaria,
  setFiltroSecretaria,
  temFiltroAtivo,
  onClear,
  mostrarHomologadosProducao = false,
}: SistemasFiltersProps) {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(filterRef, () => setShowFilterPanel(false));

  const contarFiltrosAtivos = () => {
    let count = 0;
    if (filtroHomologados) count++;
    if (filtroAcessiveis) count++;
    if (filtroTipoAcesso) count++;
    if (filtroSecretaria) count++;
    return count;
  };

  const filtrosAtivos = contarFiltrosAtivos();

  return (
    <div className="mb-6 flex flex-wrap gap-3 rounded-xl border bg-white p-4" style={{ borderColor: "#e2e8f0" }}>
      {/* Busca */}
      <div className="flex-1 min-w-48">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, sigla ou descrição..."
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "#cbd5e1", color: "#1e293b" }}
        />
      </div>

      {/* Botão de filtros com painel */}
      <div className="relative" ref={filterRef}>
        <button
          type="button"
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          className="rounded-lg border px-4 py-2 text-sm font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors"
          style={{ borderColor: "#cbd5e1", color: "#475569" }}
        >
          ⚙️ Filtros
          {filtrosAtivos > 0 && (
            <span
              className="rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center text-white"
              style={{ backgroundColor: "#2563eb" }}
            >
              {filtrosAtivos}
            </span>
          )}
        </button>

        {/* Painel de filtros dropdown */}
        {showFilterPanel && (
          <div
            className="absolute top-full mt-2 right-0 w-72 rounded-lg border bg-white shadow-lg z-10 p-4"
            style={{ borderColor: "#e2e8f0" }}
          >
            <div className="space-y-4">
              {/* Filtro de Ambiente */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#1e293b" }}>
                  Ambiente
                </label>
                <select
                  value={filtroAmbiente}
                  onChange={(e) => setFiltroAmbiente(e.target.value as "producao" | "homologacao" | "ambos")}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: "#cbd5e1", color: "#1e293b" }}
                >
                  <option value="ambos">Ambos (Padrão)</option>
                  {mostrarHomologadosProducao && <option value="producao">Produção</option>}
                  {mostrarHomologadosProducao && <option value="homologacao">Homologação</option>}
                </select>
              </div>

              {/* Divisor */}
              <div style={{ borderTop: "1px solid #e2e8f0" }} />

              {/* Filtro de Homologados (visível apenas para perfis específicos) */}
              {mostrarHomologadosProducao && (
                <div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filtroHomologados}
                      onChange={(e) => setFiltroHomologados(e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ borderColor: "#cbd5e1" }}
                    />
                    <span style={{ color: "#1e293b", fontWeight: 500 }}>Homologados</span>
                  </label>
                </div>
              )}

              {/* Filtro de Acessíveis */}
              <div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filtroAcessiveis}
                    onChange={(e) => setFiltroAcessiveis(e.target.checked)}
                    className="w-4 h-4 rounded"
                    style={{ borderColor: "#cbd5e1" }}
                  />
                  <span style={{ color: "#1e293b", fontWeight: 500 }}>Acessíveis</span>
                </label>
              </div>

              {/* Divisor */}
              <div style={{ borderTop: "1px solid #e2e8f0" }} />

              {/* Filtro de Tipo de Acesso */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#1e293b" }}>
                  Tipo de Acesso
                </label>
                <select
                  value={filtroTipoAcesso}
                  onChange={(e) => setFiltroTipoAcesso(e.target.value as "" | "publico" | "restrito")}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: "#cbd5e1", color: "#1e293b" }}
                >
                  <option value="">Todos</option>
                  <option value="publico">Público</option>
                  <option value="restrito">Restrito</option>
                </select>
              </div>

              {/* Filtro de Secretaria */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#1e293b" }}>
                  Secretaria
                </label>
                <select
                  value={filtroSecretaria}
                  onChange={(e) => setFiltroSecretaria(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: "#cbd5e1", color: "#1e293b" }}
                >
                  <option value="">Todas</option>
                  {SECRETARIAS.map((secretaria) => (
                    <option key={secretaria} value={secretaria}>{secretaria}</option>
                  ))}
                </select>
              </div>

              {/* Divisor */}
              <div style={{ borderTop: "1px solid #e2e8f0" }} />

              {/* Botões de ação */}
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    onClear();
                    setShowFilterPanel(false);
                  }}
                  disabled={!temFiltroAtivo}
                  className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#ef4444" }}
                >
                  Limpar tudo
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilterPanel(false)}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-50"
                  style={{ borderColor: "#cbd5e1", color: "#475569" }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
