import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/supabase-server";
import { withAuth } from "@/src/lib/api-guard";

const validateNotificacaoBody = (body: any) => {
  if (!body || typeof body !== "object") return "Payload inválido.";
  if (!body.tipo || typeof body.tipo !== "string") return "O tipo da notificação é obrigatório.";
  if (!body.mensagem || typeof body.mensagem !== "string") return "A mensagem da notificação é obrigatória.";
  return null;
};

export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
    const { data, error } = await supabaseServer
      .from("notificacoes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async () => {
    const body = await req.json();
    const validationError = validateNotificacaoBody(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { data, error } = await supabaseServer.from("notificacoes").insert(body);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  }, ["admin", "editor"]);
}

export async function PATCH(request: NextRequest) {
  return withAuth(request, async () => {
    const { error } = await supabaseServer
      .from("notificacoes")
      .update({ lida: true })
      .eq("lida", false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  });
}
