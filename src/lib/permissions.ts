import type { Role } from "@/types/dashboard";

export type PermissionAction = "view" | "edit" | "create" | "delete";
export type PermissionModule =
  | "dashboard"
  | "sistemas"
  | "inventario"
  | "levantamento"
  | "usuarios"
  | "notificacoes"
  | "areas"
  | "fontes_dados"
  | "registros";

export type ModulePermissions = {
  view: boolean;
  edit: boolean;
  create: boolean;
  delete: boolean;
};

export type Permissions = Record<PermissionModule, ModulePermissions>;

export const DEFAULT_PERMISSIONS: Record<Role, Permissions> = {
  admin: {
    dashboard: { view: true, edit: true, create: true, delete: true },
    sistemas: { view: true, edit: true, create: true, delete: true },
    inventario: { view: true, edit: true, create: true, delete: true },
    levantamento: { view: true, edit: true, create: true, delete: true },
    usuarios: { view: true, edit: true, create: true, delete: true },
    notificacoes: { view: true, edit: true, create: true, delete: true },
    areas: { view: true, edit: true, create: true, delete: true },
    fontes_dados: { view: true, edit: true, create: true, delete: true },
    registros: { view: true, edit: true, create: true, delete: true },
  },
  editor: {
    dashboard: { view: true, edit: true, create: true, delete: false },
    sistemas: { view: true, edit: true, create: true, delete: false },
    inventario: { view: true, edit: true, create: true, delete: false },
    levantamento: { view: true, edit: true, create: true, delete: false },
    usuarios: { view: false, edit: false, create: false, delete: false },
    notificacoes: { view: false, edit: false, create: false, delete: false },
    areas: { view: true, edit: true, create: true, delete: false },
    fontes_dados: { view: true, edit: true, create: true, delete: false },
    registros: { view: true, edit: true, create: true, delete: false },
  },
  painel_editor: {
    dashboard: { view: true, edit: true, create: true, delete: false },
    sistemas: { view: true, edit: false, create: false, delete: false },
    inventario: { view: true, edit: false, create: false, delete: false },
    levantamento: { view: true, edit: false, create: false, delete: false },
    usuarios: { view: false, edit: false, create: false, delete: false },
    notificacoes: { view: false, edit: false, create: false, delete: false },
    areas: { view: true, edit: false, create: false, delete: false },
    fontes_dados: { view: true, edit: false, create: false, delete: false },
    registros: { view: false, edit: false, create: false, delete: false },
  },
  sistema_editor: {
    dashboard: { view: true, edit: false, create: false, delete: false },
    sistemas: { view: true, edit: true, create: true, delete: false },
    levantamento: { view: true, edit: false, create: false, delete: false },
    inventario: { view: true, edit: false, create: false, delete: false },
    usuarios: { view: false, edit: false, create: false, delete: false },
    notificacoes: { view: false, edit: false, create: false, delete: false },
    areas: { view: true, edit: false, create: false, delete: false },
    fontes_dados: { view: true, edit: false, create: false, delete: false },
    registros: { view: false, edit: false, create: false, delete: false },
  },
  inventario_editor: {
    dashboard: { view: true, edit: false, create: false, delete: false },
    sistemas: { view: true, edit: false, create: false, delete: false },
    levantamento: { view: true, edit: false, create: false, delete: false },
    inventario: { view: true, edit: true, create: true, delete: false },
    usuarios: { view: false, edit: false, create: false, delete: false },
    notificacoes: { view: false, edit: false, create: false, delete: false },
    areas: { view: true, edit: false, create: false, delete: false },
    fontes_dados: { view: true, edit: false, create: false, delete: false },
    registros: { view: false, edit: false, create: false, delete: false },
  },
  viewer: {
    dashboard: { view: true, edit: false, create: false, delete: false },
    levantamento: { view: true, edit: false, create: false, delete: false },
    sistemas: { view: true, edit: false, create: false, delete: false },
    inventario: { view: true, edit: false, create: false, delete: false },
    usuarios: { view: false, edit: false, create: false, delete: false },
    notificacoes: { view: false, edit: false, create: false, delete: false },
    areas: { view: true, edit: false, create: false, delete: false },
    fontes_dados: { view: true, edit: false, create: false, delete: false },
    registros: { view: false, edit: false, create: false, delete: false },
  },
};

export function normalizePermissionModule(moduleName: string | undefined): PermissionModule | null {
  if (!moduleName) {
    return null;
  }

  switch (moduleName.toLowerCase()) {
    case "painel":
    case "dashboard":
      return "dashboard";
    case "sistemas":
      return "sistemas";
    case "inventario":
      return "inventario";
    case "levantamento":
      return "levantamento";
    case "usuarios":
      return "usuarios";
    case "notificacoes":
      return "notificacoes";
    case "areas":
      return "areas";
    case "fontes_dados":
      return "fontes_dados";
    case "registros":
      return "registros";
    default:
      return null;
  }
}

export function resolvePermissions(role: Role, customPermissions?: Partial<Permissions>): Permissions {
  const base = DEFAULT_PERMISSIONS[role] ?? DEFAULT_PERMISSIONS.viewer;

  if (!customPermissions) {
    return base;
  }

  return Object.keys(base).reduce((acc, moduleName) => {
    const moduleKey = moduleName as PermissionModule;
    acc[moduleKey] = {
      ...base[moduleKey],
      ...customPermissions[moduleKey],
    };
    return acc;
  }, {} as Permissions);
}
