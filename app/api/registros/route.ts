import { NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/supabase-server";

const validateRegistroBody = (body: any) => {
  if (!body || typeof body !== "object") return "Payload inválido.";
  if (!body.nome || typeof body.nome !== "string") return "O nome é obrigatório.";
  if (!body.categoria || typeof body.categoria !== "string") return "A categoria é obrigatória.";
  if (!body.criado_por || typeof body.criado_por !== "string") return "O campo criado_por é obrigatório.";
  return null;
};

export async function GET() {
  const { data, error } = await supabaseServer
    .from("registros")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const body = await req.json();
  const validationError = validateRegistroBody(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { data, error } = await supabaseServer.from("registros").insert(body);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
