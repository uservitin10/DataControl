import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const userId = searchParams.get("user_id");
    const action = searchParams.get("action");

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

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao buscar logs de auditoria:", error);
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Erro na API de auditoria:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, action, resource_type, resource_id, details, ip_address } = body;

    if (!user_id || !action) {
      return NextResponse.json({ error: "user_id e action são obrigatórios" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("audit_logs")
      .insert({
        user_id,
        action,
        resource_type: resource_type || null,
        resource_id: resource_id || null,
        details: details || null,
        ip_address: ip_address || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar log de auditoria:", error);
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Erro na API de auditoria:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}