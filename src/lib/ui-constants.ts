// Global UI Colors
export const COLORS = {
  primary: "#1a2744",
  secondary: "#2d3a5c",
  border: "#cbd5e1",
  success: "#22c55e",
  error: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
  background: "#f8fafc",
  cardBg: "#e2e8f0",
};

// Common Tailwind Classes
export const UI_CLASSES = {
  // Input & Select
  input: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
  inputSlate: "w-full rounded-lg border px-3 py-2 text-sm outline-none border-slate-300",
  
  // Labels
  label: "block text-sm font-medium text-gray-700 mb-1",
  labelRequired: "block text-sm font-medium text-gray-700 mb-1",
  labelSlate: "mb-1 block text-xs font-medium text-slate-600",
  
  // Buttons
  buttonBase: "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
  buttonPrimary: "rounded-lg px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:opacity-90",
  buttonSecondary: "rounded-lg border px-4 py-2 text-sm text-slate-600 border-slate-300 hover:bg-slate-50",
  buttonSmall: "rounded px-3 py-1.5 text-xs font-medium transition-colors",
  buttonEdit: "rounded px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors",
  buttonDelete: "rounded px-3 py-1.5 text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors",
  
  // Cards
  card: "rounded-2xl border bg-white overflow-hidden",
  cardWithShadow: "rounded-2xl border bg-white shadow-soft hover:shadow-lg transition-all duration-200",
  
  // Text
  textSmall: "text-sm text-slate-500",
  textError: "text-xs text-red-600",
  textSuccess: "text-xs text-green-600",
  textHelpText: "text-xs text-slate-400",
  textRequired: "text-red-500",
  
  // Form
  formError: "rounded-lg border p-2.5 text-sm border-red-200 bg-red-50 text-red-600",
  formSuccess: "rounded-lg border p-3 bg-green-50 border-green-200 text-green-700",
  
  // Modal
  modal: "fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4",
  modalContent: "w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl",
};

// Role Labels
export const ROLE_LABELS: Record<"admin" | "editor" | "viewer" | "painel_editor" | "sistema_editor" | "inventario_editor", string> = {
  admin: "Admin",
  editor: "Desenvolvedor",
  viewer: "Viewer",
  painel_editor: "Editor de Painel",
  sistema_editor: "Editor de Sistemas",
  inventario_editor: "Editor de Inventário",
};

// Role Config for Profile
export const ROLE_CONFIG = {
  admin: { label: "Administrador", color: "bg-red-100 text-red-700" },
  editor: { label: "Desenvolvedor", color: "bg-blue-100 text-blue-700" },
  viewer: { label: "Apenas Leitura", color: "bg-slate-100 text-slate-600" },
  painel_editor: { label: "Editor em Painel", color: "bg-blue-100 text-blue-700" },
  sistema_editor: { label: "Editor de Sistemas", color: "bg-purple-100 text-purple-700" },
  inventario_editor: { label: "Editor de Inventário", color: "bg-green-100 text-green-700" },
};
