import type { Dispatch, SetStateAction } from "react";

type DocumentFiltersProps = {
  busca: string;
  setBusca: Dispatch<SetStateAction<string>>;
  filtroAcesso: string;
  setFiltroAcesso: Dispatch<SetStateAction<string>>;
  filtroSensivel: string;
  setFiltroSensivel: Dispatch<SetStateAction<string>>;
  temFiltroAtivo: boolean;
  onClear: () => void;
};

export function DocumentFilters({
  busca,
  setBusca,
  filtroAcesso,
  setFiltroAcesso,
  filtroSensivel,
  setFiltroSensivel,
  temFiltroAtivo,
  onClear,
}: DocumentFiltersProps) {
  return (
    <div className="mb-6 flex flex-wrap gap-3 rounded-xl border bg-white p-4" style={{ borderColor: "#e2e8f0" }}>
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

      <select
        value={filtroAcesso}
        onChange={(e) => setFiltroAcesso(e.target.value)}
        className="rounded-lg border px-3 py-2 text-sm outline-none"
        style={{ borderColor: "#cbd5e1", color: "#475569" }}
      >
        <option value="">Todos os acessos</option>
        <option value="publico">Público</option>
        <option value="restrito">Restrito</option>
      </select>

      <select
        value={filtroSensivel}
        onChange={(e) => setFiltroSensivel(e.target.value)}
        className="rounded-lg border px-3 py-2 text-sm outline-none"
        style={{ borderColor: "#cbd5e1", color: "#475569" }}
      >
        <option value="">Todos os dados</option>
        <option value="sim">Dados sensíveis</option>
        <option value="nao">Sem dados sensíveis</option>
      </select>

      {temFiltroAtivo && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-slate-50"
          style={{ borderColor: "#cbd5e1", color: "#64748b" }}
        >
          Limpar filtros ✕
        </button>
      )}
    </div>
  );
}
