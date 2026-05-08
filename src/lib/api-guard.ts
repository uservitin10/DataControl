import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";
import { supabaseServer } from "@/src/lib/supabase-server";
import type { Role } from "@/src/types/dashboard";

interface JWTPayload {
  sub: string;
  email?: string;
  user_metadata?: {
    nome?: string;
    role?: Role;
  };
  role?: Role;
}

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

/**
 * Valida autenticação e autorização
 * Retorna { user, error, status } ou null se válido
 */
export async function validateAuth(
  request: NextRequest,
  requiredRoles?: Role[]
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

  // Verificar role se especificado
  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = (profile.role as Role) || "viewer";

    if (!requiredRoles.includes(userRole)) {
      return {
        error: "Acesso negado",
        status: 403,
      };
    }
  }

  return {
    user: {
      id: userId,
      email: payload.email,
      nome: profile.display_name || payload.user_metadata?.nome,
      role: (profile.role as Role) || "viewer",
    },
    error: null,
    status: 200,
  };
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
  handler: (user: any) => Promise<NextResponse>,
  requiredRoles?: Role[]
) {
  const validation = await validateAuth(request, requiredRoles);

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
