import { useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";

type DocumentFiltersProps = {
  busca: string;
  setBusca: Dispatch<SetStateAction<string>>;
  filtroSensivel: string;
  setFiltroSensivel: Dispatch<SetStateAction<string>>;
  filtroFonte: boolean;
  setFiltroFonte: Dispatch<SetStateAction<boolean>>;
  temFiltroAtivo: boolean;
  onClear: () => void;
};

export function DocumentFilters({
  busca,
  setBusca,
  filtroSensivel,
  setFiltroSensivel,
  filtroFonte,
  setFiltroFonte,
  temFiltroAtivo,
  onClear,
}: DocumentFiltersProps) {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(filterRef, () => setShowFilterPanel(false));

  const contarFiltrosAtivos = () => {
    let count = 0;
    if (filtroSensivel) count++;
    if (filtroFonte) count++;
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
          placeholder="Buscar por nome ou descrição..."
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

              {/* Filtro de Dados Sensíveis */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#1e293b" }}>
                  Dados Sensíveis
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="sensivel"
                      checked={filtroSensivel === ""}
                      onChange={() => setFiltroSensivel("")}
                      className="w-4 h-4"
                      style={{ borderColor: "#cbd5e1" }}
                    />
                    <span style={{ color: "#475569" }}>Todos os dados</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="sensivel"
                      checked={filtroSensivel === "sim"}
                      onChange={() => setFiltroSensivel("sim")}
                      className="w-4 h-4"
                      style={{ borderColor: "#cbd5e1" }}
                    />
                    <span style={{ color: "#475569" }}>Dados sensíveis</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="sensivel"
                      checked={filtroSensivel === "nao"}
                      onChange={() => setFiltroSensivel("nao")}
                      className="w-4 h-4"
                      style={{ borderColor: "#cbd5e1" }}
                    />
                    <span style={{ color: "#475569" }}>Sem dados sensíveis</span>
                  </label>
                </div>
              </div>

              {/* Divisor */}
              <div style={{ borderTop: "1px solid #e2e8f0" }} />

              {/* Filtro de Fonte Disponível */}
              <div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filtroFonte}
                    onChange={(e) => setFiltroFonte(e.target.checked)}
                    className="w-4 h-4 rounded"
                    style={{ borderColor: "#cbd5e1" }}
                  />
                  <span style={{ color: "#1e293b", fontWeight: 500 }}>Fonte disponível</span>
                </label>
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
                  className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#ef4444" }}
                >
                  Limpar tudo
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilterPanel(false)}
                  className="flex-1 rounded-lg px-3 py-2 text-sm font-medium border hover:bg-slate-50 transition-colors"
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
