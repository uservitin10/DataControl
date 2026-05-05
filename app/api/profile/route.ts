import { NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/supabase-server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Id de usuário é obrigatório." }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("profiles")
    .select("role, display_name")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
