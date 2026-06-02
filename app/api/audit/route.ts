import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const getRequestIp = (request: NextRequest) => {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.trim();
  }

  const headerCandidates = [
    "x-real-ip",
    "cf-connecting-ip",
    "fastly-client-ip",
    "true-client-ip",
    "x-client-ip",
    "x-forwarded",
    "forwarded-for",
    "forwarded",
  ];

  for (const h of headerCandidates) {
    const value = request.headers.get(h);
    if (value) {
      return value.split(",")[0].trim();
    }
  }

  return null;
};

const getAuthToken = (request: NextRequest) => {
  const header = request.headers.get("authorization");
  if (!header) return null;
  return header.startsWith("Bearer ") ? header.replace("Bearer ", "") : null;
};

const isAuditTableMissing = (error: unknown) => {
  if (!error) return false;

  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
      ? error.message
      : JSON.stringify(error);

  const maybeCode =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: string }).code
      : undefined;

  return (
    maybeCode === "PGRST205" ||
    (typeof message === "string" && message.includes("Could not find the table 'public.audit_logs'"))
  );
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const userId = searchParams.get("user_id");
    const action = searchParams.get("action");
    const resourceType = searchParams.get("resource_type");
    const resourceId = searchParams.get("resource_id");

    let query = supabaseServer
      .from("audit_logs")
      .select(`
        *,
        profiles:user_id (
          display_name,
          role
        )
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (action) {
      query = query.eq("action", action);
    }

    if (resourceType) {
      query = query.eq("resource_type", resourceType);
    }

    if (resourceId) {
      query = query.eq("resource_id", resourceId);
    }

    const { data, error } = await query;

    if (error) {
      if (isAuditTableMissing(error)) {
        console.warn("Audit logging não configurado: tabela audit_logs não encontrada.");
        return NextResponse.json([], { status: 200 });
      }

      console.error("Erro ao buscar logs de auditoria:", error);
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
    }

    return NextResponse.json({ data: data || [], missingTable: false });
  } catch (error) {
    console.error("Erro na API de auditoria:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let user_id = body.user_id;
    const action = body.action;
    const resource_type = body.resource_type;
    const resource_id = body.resource_id;
    const details = body.details;
    const ip_address = getRequestIp(request);

    if (!user_id) {
      const token = getAuthToken(request);
      if (token) {
        const { data: userData } = await supabaseServer.auth.getUser(token);
        user_id = userData?.user?.id || user_id;
      }
    }

    if (!action) {
      return NextResponse.json({ error: "action é obrigatório" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("audit_logs")
      .insert({
        user_id: user_id || null,
        action,
        resource_type: resource_type || null,
        resource_id: resource_id || null,
        details: details || null,
        ip_address,
      })
      .select()
      .single();

    if (error) {
      if (isAuditTableMissing(error)) {
        console.warn("Audit logging não configurado: tabela audit_logs não encontrada.", {
          payload: { user_id, action, resource_type, resource_id, details, ip_address },
        });
        return NextResponse.json(
          {
            message: "Audit logging não está configurado. Crie a tabela audit_logs no Supabase.",
            missingTable: true,
          },
          { status: 200 }
        );
      }

      const supabaseError = error as {
        code?: string;
        message?: string;
        details?: unknown;
        hint?: string;
      };

      console.error("Erro ao criar log de auditoria:", {
        code: supabaseError.code,
        message: supabaseError.message,
        details: supabaseError.details,
        hint: supabaseError.hint,
        data,
        payload: { user_id, action, resource_type, resource_id, details, ip_address },
      });

      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Erro na API de auditoria:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
