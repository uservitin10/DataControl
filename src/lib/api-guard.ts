import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";
import { supabaseServer } from "@/lib/supabase-server";
import type { Role } from "@/types/dashboard";
import { DEFAULT_PERMISSIONS, normalizePermissionModule } from "@/lib/permissions";
import type { PermissionAction, PermissionModule } from "@/lib/permissions";

type PermissionRequirement = {
  module: PermissionModule;
  action: PermissionAction;
};

type AuthRequirement = Role[] | PermissionRequirement;

type AuthUser = {
  id: string | null;
  email: string | null;
  nome: string;
  role: Role;
};

interface JWTPayload {
  sub: string;
  email?: string;
  user_metadata?: {
    nome?: string;
    role?: Role;
  };
  role?: Role;
}

type PermissionRow = {
  can_view?: boolean;
  can_edit?: boolean;
  can_create?: boolean;
  can_delete?: boolean;
  module?: { name?: string } | string;
};

/**
 * Extrai e valida o token de autenticação da requisição
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return null;
  }

  return token;
}

/**
 * Decodifica o JWT e extrai informações do usuário
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    return decoded;
  } catch (error) {
    console.error("Erro ao decodificar JWT:", error);
    return null;
  }
}

/**
 * Busca o perfil do usuário no banco de dados
 */
async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabaseServer
      .from("profiles")
      .select("role, display_name")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Erro ao buscar perfil:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    return null;
  }
}

function getPermissionValue(row: PermissionRow, action: PermissionAction): boolean {
  if (!row) {
    return false;
  }

  if (action === "view") {
    return Boolean(row.can_view);
  }
  if (action === "edit" || action === "create") {
    return Boolean(row.can_edit);
  }
  if (action === "delete") {
    return Boolean(row.can_delete);
  }

  return false;
}

async function getUserPermissionValue(userId: string, moduleName: PermissionModule, action: PermissionAction) {
  try {
    const { data, error } = await supabaseServer
      .from("user_permissions")
      .select("can_view,can_edit,can_create,can_delete")
      .eq("user_id", userId)
      .eq("module", moduleName)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar permissões de usuário:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    return getPermissionValue(data, action);
  } catch (error) {
    console.error("Erro ao validar permissão de usuário:", error);
    return null;
  }
}

async function getRolePermissionValue(role: Role, moduleName: PermissionModule, action: PermissionAction) {
  if (role === "admin") {
    return true;
  }

  try {
    const { data, error } = await supabaseServer
      .from("role_permissions")
      .select("can_view,can_edit,can_delete,module:module_id(name)")
      .eq("role", role);

    if (error) {
      console.error("Erro ao buscar permissões de role:", error);
      return null;
    }

    const permissions = Array.isArray(data) ? data as PermissionRow[] : [];
    const permissionRow = permissions.find((row: PermissionRow) => normalizePermissionModule(row.module?.name) === moduleName);

    if (permissionRow) {
      return getPermissionValue(permissionRow, action);
    }

    return null;
  } catch (error) {
    console.error("Erro ao validar permissão de role:", error);
    return null;
  }
}

async function hasPermission(userId: string, role: Role, requirement: PermissionRequirement) {
  if (requirement.module === "notificacoes" && role !== "admin") {
    return false;
  }

  if (role === "admin") {
    return true;
  }

  const userPermission = await getUserPermissionValue(userId, requirement.module, requirement.action);
  if (userPermission !== null) {
    return userPermission;
  }

  const rolePermission = await getRolePermissionValue(role, requirement.module, requirement.action);
  if (rolePermission !== null) {
    return rolePermission;
  }

  const defaultPermissions = DEFAULT_PERMISSIONS[role] ?? DEFAULT_PERMISSIONS.viewer;
  return getPermissionValue(defaultPermissions[requirement.module], requirement.action);
}

/**
 * Valida autenticação e autorização
 */
export async function validateAuth(
  request: NextRequest,
  requirement?: AuthRequirement
) {
  const token = extractToken(request);

  if (!token) {
    return {
      error: "Token não fornecido",
      status: 401,
    };
  }

  const payload = decodeJWT(token);

  if (!payload) {
    return {
      error: "Token inválido",
      status: 401,
    };
  }

  const userId = payload.sub;
  if (!userId) {
    return {
      error: "User ID não encontrado no token",
      status: 401,
    };
  }

  // Buscar perfil do banco de dados para obter role atualizada
  const profile = await getUserProfile(userId);

  if (!profile) {
    return {
      error: "Perfil de usuário não encontrado",
      status: 401,
    };
  }

  const userRole = (profile.role as Role) || "viewer";

  if (requirement) {
    if (Array.isArray(requirement)) {
      if (!requirement.includes(userRole)) {
        return {
          error: "Acesso negado",
          status: 403,
        };
      }
    } else {
      const allowed = await hasPermission(userId, userRole, requirement);
      if (allowed === null) {
        return {
          error: "Erro ao validar permissão",
          status: 500,
        };
      }
      if (!allowed) {
        return {
          error: "Acesso negado",
          status: 403,
        };
      }
    }
  }

  return {
    user: {
      id: userId,
      email: payload.email,
      nome: profile.display_name || payload.user_metadata?.nome,
      role: userRole,
    },
    error: null,
    status: 200,
  };
}

/**
 * Wrapper para rotas com autenticação opcional (acesso público permitido)
 * Uso:
 * export async function GET(request: NextRequest) {
 *   return withOptionalAuth(request, async (user) => {
 *     // seu código aqui - user pode ser null para visitantes
 *   });
 * }
 */
export async function withOptionalAuth(
  request: NextRequest,
  handler: (user: AuthUser) => Promise<NextResponse>
) {
  const token = extractToken(request);

  let user = null;

  if (token) {
    const payload = decodeJWT(token);

    if (payload) {
      const userId = payload.sub;
      if (userId) {
        const profile = await getUserProfile(userId);
        if (profile) {
          user = {
            id: userId,
            email: payload.email,
            nome: profile.display_name || payload.user_metadata?.nome,
            role: (profile.role as Role) || "viewer",
          };
        }
      }
    }
  }

  // Se não há usuário autenticado, define como visitante
  if (!user) {
    user = {
      id: null,
      email: null,
      nome: "Visitante",
      role: "viewer",
    };
  }

  try {
    return await handler(user);
  } catch (error) {
    console.error("Erro na rota:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * Wrapper para rotas protegidas
 * Uso:
 * export async function GET(request: NextRequest) {
 *   return withAuth(request, async (user) => {
 *     // seu código aqui
 *   }, ["admin", "editor"]);
 * }
 */
export async function withAuth(
  request: NextRequest,
  handler: (user: AuthUser) => Promise<NextResponse>,
  requirement?: AuthRequirement
) {
  const validation = await validateAuth(request, requirement);

  if (validation.error) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  try {
    return await handler(validation.user);
  } catch (error) {
    console.error("Erro na rota protegida:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}