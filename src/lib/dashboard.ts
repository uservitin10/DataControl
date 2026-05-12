import type { DashboardForm } from "@/src/types/dashboard";

export const AREAS = [
  "BI Munis", "Congresso/Senado/Câmara", "Contabilidade",
  "Contratações COSCO", "Gestão Estratégica", "Logística e Contratações",
  "Manuais Técnicos", "Orçamento e Finanças", "Pessoas", "PFE", "TIC", "Painel do Planner CGTCO",
];

export const SECRETARIAS = [
  "Secretaria-Executiva (SEEXEC)",
  "Secretaria de Orçamento Federal (SOF)",
  "Secretaria de Assuntos Internacionais e Desenvolvimento",
  "Secretaria Nacional de Planejamento (SEPLAN)",
  "Secretaria de Monitoramento e Avaliação de Políticas Públicas e Assuntos Econômicos",
  "Secretaria de Articulação Institucional",
  "Gabinete do Ministro",
  "Subsecretaria de Administração e Gestão Estratégica",
  "Assessoria de Participação Social e Diversidade",
  "Assessoria de Relações Internacionais",
  "Assessoria Especial de Controle Interno",
  "Assessoria Especial de Comunicação Social",
  "Assessoria Especial de Assuntos Parlamentares e Federativos",
  "Assessoria Técnica e Administrativa",
  "Consultoria Jurídica",
  "Ouvidoria",
  "Corregedoria",
];

export const AREA_CORES: Record<string, { bg: string; text: string }> = {
  "BI Munis":                  { bg: "#e8edf5", text: "#1a2744" },
  "Congresso/Senado/Câmara":   { bg: "#ede9fe", text: "#4c1d95" },
  "Contabilidade":             { bg: "#dcfce7", text: "#14532d" },
  "Contratações COSCO":        { bg: "#fef3c7", text: "#78350f" },
  "Gestão Estratégica":        { bg: "#fce7f3", text: "#831843" },
  "Logística e Contratações":  { bg: "#e0f2fe", text: "#0c4a6e" },
  "Manuais Técnicos":          { bg: "#f0fdf4", text: "#14532d" },
  "Orçamento e Finanças":      { bg: "#fff7ed", text: "#7c2d12" },
  "Pessoas":                   { bg: "#fdf4ff", text: "#581c87" },
  "PFE":                       { bg: "#f0f9ff", text: "#0c4a6e" },
  "TIC":                       { bg: "#fef2f2", text: "#7f1d1d" },
  "Painel do Planner CGTCO":   { bg: "#e0f2fe", text: "#0369a1" },
};

export const EMPTY_FORM: DashboardForm = {
  nome: "",
  categoria: AREAS[0],
  descricao: "",
  tipo_acesso: "publico",
  responsavel: "",
  desenvolvedor: "",
  fonte_dados: "",
  dados_sensiveis: false,
  secretaria: "",
};

export const getFileTipo = (path?: string) => {
  if (!path) return null;
  const ext = path.split(".").pop()?.toLowerCase();
  const tipos: Record<string, { label: string; bg: string; text: string }> = {
    pdf:  { label: "PDF",        bg: "#fee2e2", text: "#991b1b" },
    xlsx: { label: "Excel",      bg: "#dcfce7", text: "#14532d" },
    xls:  { label: "Excel",      bg: "#dcfce7", text: "#14532d" },
    docx: { label: "Word",       bg: "#dbeafe", text: "#1e40af" },
    doc:  { label: "Word",       bg: "#dbeafe", text: "#1e40af" },
    pptx: { label: "PowerPoint", bg: "#ffedd5", text: "#9a3412" },
    ppt:  { label: "PowerPoint", bg: "#ffedd5", text: "#9a3412" },
    pbix: { label: "Power BI",   bg: "#fdf4ff", text: "#6b21a8" },
    png:  { label: "Imagem",     bg: "#f0f9ff", text: "#0c4a6e" },
    jpg:  { label: "Imagem",     bg: "#f0f9ff", text: "#0c4a6e" },
    jpeg: { label: "Imagem",     bg: "#f0f9ff", text: "#0c4a6e" },
  };
  return tipos[ext ?? ""] ?? { label: ext?.toUpperCase() ?? "Arquivo", bg: "#f1f5f9", text: "#475569" };
};

export const formatarTempo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  if (h < 24) return `há ${h}h`;
  return `há ${d} dia${d > 1 ? "s" : ""}`;
};

export const tipoIcon: Record<string, string> = {
  cadastro: "",
  edicao: "",
  exclusao: "",
};
