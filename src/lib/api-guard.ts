import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { auth } from "@/auth";
import { jwtDecode } from "jwt-decode";
import pool from "@/lib/db";
import { getProfileById } from "@/lib/profile";
import { sanitizeText } from "@/lib/text";
import type { Role } from "@/types/dashboard";
import { DEFAULT_PERMISSIONS, normalizePermissionModule } from "@/lib/permissions";
import type { PermissionAction, PermissionModule, ModulePermissions } from "@/lib/permissions";

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

type ValidateAuthResult = {
  user: AuthUser | null;
  error: string | null;
  status: number;
};

/**
 * Extrai e valida o token de autenticação da requisição
 */
export type ExtractedToken = string | JWTPayload;

export async function extractToken(request: NextRequest): Promise<ExtractedToken | null> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "");
  }

  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
      raw: false,
    });

    if (typeof token === "string") {
      return token;
    }

    if (token && typeof token === "object") {
      return token as JWTPayload;
    }
  } catch (error) {
    // ignore token extraction failures and fallback to no token
  }

  try {
    const session = await auth();
    const user = session?.user;
    if (user?.id) {
      return {
        sub: user.id,
        email: user.email ?? undefined,
        role: user.role as Role | undefined,
      };
    }
  } catch (error) {
    // ignore session extraction failures and fallback to no token
  }

  return null;
}

/**
 * Decodifica o JWT e extrai informações do usuário
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    return decoded;
  } catch (error) {
    console.error(
      "Erro ao decodificar JWT:",
      error,
      typeof token === "string"
        ? `token size=${token.length} startsWith=${token.slice(0, 15)}...`
        : token
    );
    return null;
  }
}

/**
 * Busca o perfil do usuário no banco de dados
 */

function isModulePermissions(row: PermissionRow | ModulePermissions | null | undefined): row is ModulePermissions {
  return Boolean(row && typeof row === "object" && "view" in row && "edit" in row && "create" in row && "delete" in row);
}

function getPermissionValue(row: PermissionRow | ModulePermissions | null | undefined, action: PermissionAction): boolean {
  if (!row) {
    return false;
  }

  if (isModulePermissions(row)) {
    if (action === "view") {
      return Boolean(row.view);
    }
    if (action === "edit" || action === "create") {
      return Boolean(row.edit);
    }
    if (action === "delete") {
      return Boolean(row.delete);
    }

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
    const result = await pool.query(
      `SELECT can_view, can_edit, can_create, can_delete
       FROM user_permissions
       WHERE user_id = $1 AND module = $2
       LIMIT 1`,
      [userId, moduleName]
    );

    const row = result.rows[0] ?? null;
    if (!row) {
      return null;
    }

    return getPermissionValue(row, action);
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
    const result = await pool.query(
      `SELECT rp.can_view, rp.can_edit, rp.can_delete, m.name AS module_name
       FROM role_permissions rp
       JOIN modules m ON m.id = rp.module_id
       WHERE rp.role = $1`,
      [role]
    );

    const permissionRow = result.rows.find((row: Record<string, unknown>) => {
      const rowModule = typeof row.module_name === "string" ? row.module_name : undefined;
      return normalizePermissionModule(rowModule) === moduleName;
    });

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
): Promise<ValidateAuthResult> {
  const token = await extractToken(request);

  if (!token) {
    return {
      user: null,
      error: "Token não fornecido",
      status: 401,
    };
  }

  const payload = typeof token === "string" ? decodeJWT(token) : token;

  if (!payload) {
    return {
      user: null,
      error: "Token inválido",
      status: 401,
    };
  }

  const userId = payload.sub;
  if (!userId) {
    return {
      user: null,
      error: "User ID não encontrado no token",
      status: 401,
    };
  }

  // Buscar perfil do banco de dados para obter role atualizada
  const profile = await getProfileById(userId);

  if (!profile) {
    return {
      user: null,
      error: "Perfil de usuário não encontrado",
      status: 401,
    };
  }

  const userRole = (profile.role as Role) || "viewer";

  if (requirement) {
    if (Array.isArray(requirement)) {
      if (!requirement.includes(userRole)) {
        return {
          user: null,
          error: "Acesso negado",
          status: 403,
        };
      }
    } else {
      const allowed = await hasPermission(userId, userRole, requirement);
      if (allowed === null) {
        return {
          user: null,
          error: "Erro ao validar permissão",
          status: 500,
        };
      }
      if (!allowed) {
        return {
          user: null,
          error: "Acesso negado",
          status: 403,
        };
      }
    }
  }

  return {
    user: {
      id: userId,
      email: payload.email ?? null,
      nome: sanitizeText(profile.display_name || payload.user_metadata?.nome || "Visitante"),
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
  const token = await extractToken(request);

  let user: AuthUser | null = null;

  if (token) {
    const payload = typeof token === "string" ? decodeJWT(token) : token;

    if (payload) {
      const userId = payload.sub;
      if (userId) {
        const profile = await getProfileById(userId);
        if (profile) {
          user = {
            id: userId,
            email: payload.email ?? null,
            nome: sanitizeText(profile.display_name || payload.user_metadata?.nome || "Visitante"),
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

  if (validation.error || !validation.user) {
    return NextResponse.json(
      { error: validation.error ?? "Acesso negado" },
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