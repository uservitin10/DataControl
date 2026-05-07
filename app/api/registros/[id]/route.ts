import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/supabase-server";

const sanitizeRegistroPatch = (body: any) => {
  const allowedFields = [
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
    "arquivo_path",
    "preview_path",
    "updated_at",
  ];
  return Object.fromEntries(
    Object.entries(body || {}).filter(([key]) => allowedFields.includes(key))
  );
};

const validateRegistroPatch = (body: any) => {
  if (!body || typeof body !== "object") return "Payload inválido.";
  if ("nome" in body && typeof body.nome !== "string") return "Nome inválido.";
  if ("categoria" in body && typeof body.categoria !== "string") return "Categoria inválida.";
  if ("link" in body && body.link !== null && typeof body.link !== "string") return "Link inválido.";
  if ("descricao" in body && typeof body.descricao !== "string") return "Descrição inválida.";
  if ("tipo_acesso" in body && typeof body.tipo_acesso !== "string") return "Tipo de acesso inválido.";
  if ("responsavel" in body && typeof body.responsavel !== "string") return "Responsável inválido.";
  if ("desenvolvedor" in body && typeof body.desenvolvedor !== "string") return "Desenvolvedor inválido.";
  if ("fonte_dados" in body && typeof body.fonte_dados !== "string") return "Fonte de dados inválida.";
  if ("dados_sensiveis" in body && typeof body.dados_sensiveis !== "boolean") return "Valor de dados sensíveis inválido.";
  if ("secretaria" in body && typeof body.secretaria !== "string") return "Secretaria inválida.";
  if ("arquivo_path" in body && body.arquivo_path !== null && typeof body.arquivo_path !== "string") return "Caminho de arquivo inválido.";
  if ("preview_path" in body && body.preview_path !== null && typeof body.preview_path !== "string") return "Caminho de preview inválido.";
  return null;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseServer
    .from("registros")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const validationError = validateRegistroPatch(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const patchBody = sanitizeRegistroPatch(body);

  const { data, error } = await supabaseServer
    .from("registros")
    .update(patchBody)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await supabaseServer.from("registros").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
