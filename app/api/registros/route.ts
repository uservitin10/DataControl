import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/supabase-server";
import { withAuth } from "@/src/lib/api-guard";

const validateRegistroBody = (body: any) => {
  if (!body || typeof body !== "object") return "Payload inválido.";
  if (!body.nome || typeof body.nome !== "string") return "O nome é obrigatório.";
  if (!body.categoria || typeof body.categoria !== "string") return "A categoria é obrigatória.";
  if (!body.criado_por || typeof body.criado_por !== "string") return "O campo criado_por é obrigatório.";
  return null;
};

const cleanRegistroBody = (body: any) => {
  const allowed = [
    "nome",
    "categoria",
    "link",
    "descricao",
    "tipo_acesso",
    "responsavel",
    "desenvolvedor",
    "fonte_dados",
    "dados_sensiveis",
    "secretaria",
    "criado_por",
    "arquivo_path",
    "preview_path",
    "updated_at",
  ];
  return Object.fromEntries(Object.entries(body || {}).filter(([key]) => allowed.includes(key)));
};

export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
    const { data, error } = await supabaseServer
      .from("registros")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async () => {
    const body = await req.json();
    const validationError = validateRegistroBody(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const cleanBody = cleanRegistroBody(body);
    const { data, error } = await supabaseServer.from("registros").insert(cleanBody);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  }, ["admin", "editor"]);
}
