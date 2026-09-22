import { DEFAULT_PERMISSIONS } from "@/lib/permissions";
import type { PermissionModule, Permissions } from "@/lib/permissions";

export type Role = "admin" | "editor" | "viewer" | "painel_editor" | "sistema_editor" | "inventario_editor";
export type Profile = { id: string; email: string; display_name?: string; role: Role; created_at?: string };
export type NewUser = { display_name: string; email: string; password: string; role: Role };

export const ALL_MODULES: Array<{ key: PermissionModule; label: string }> = [
  { key: "dashboard", label: "Painel" }, { key: "sistemas", label: "Sistemas" },
  { key: "inventario", label: "Inventário" }, { key: "registros", label: "Registros" },
  { key: "notificacoes", label: "Notificações" }, { key: "areas", label: "Áreas" },
  { key: "fontes_dados", label: "Fontes de Dados" },
];
export const EMPTY_NEW_USER: NewUser = { display_name: "", email: "", password: "", role: "viewer" };

export function createEmptyPermissions(): Permissions {
  return ALL_MODULES.reduce((permissions, module) => {
    permissions[module.key] = { view: false, edit: false, create: false, delete: false };
    return permissions;
  }, {} as Permissions);
}
export function getDefaultPermissions(role: Role): Permissions { return DEFAULT_PERMISSIONS[role] ?? createEmptyPermissions(); }
export function filterUsers(users: Profile[], search: string): Profile[] {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return users;
  return users.filter((user) => user.email.toLowerCase().includes(normalizedSearch) || user.display_name?.toLowerCase().includes(normalizedSearch));
}
export function validateNewUser(user: NewUser): string | null {
  if (!user.display_name.trim() || !user.email.trim() || !user.password.trim()) return "Preencha nome, email e senha para criar o usuário.";
  if (user.password.length < 6) return "A senha precisa ter pelo menos 6 caracteres.";
  return null;
}
export function getErrorMessage(error: unknown): string { return error instanceof Error ? error.message : "Ocorreu um erro inesperado."; }
export function updateModulePermission(permissions: Permissions, module: PermissionModule, action: keyof Permissions[PermissionModule], value: boolean): Permissions {
  return { ...permissions, [module]: { ...permissions[module], [action]: value } };
}