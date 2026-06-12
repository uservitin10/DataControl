import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/api-guard";
import { supabaseServer } from "@/lib/supabase-server";

// GET - List all modulos (admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await validateAuth(request, {
      module: "areas",
      action: "view",
    });

    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { data, error } = await supabaseServer
      .from("modulos")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      throw new Error(error.message || JSON.stringify(error));
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching modulos:", error);
    const message =
      error instanceof Error
        ? error.message
        : error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message)
        : "Failed to fetch modulos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Create new modulo (admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await validateAuth(request, {
      module: "areas",
      action: "create",
    });

    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { nome, descricao } = await request.json();

    if (!nome || nome.trim() === "") {
      return NextResponse.json(
        { error: "Nome é obrigatório" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from("modulos")
      .insert([
        {
          nome: nome.trim(),
          descricao: descricao?.trim() || null,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error("Error creating modulo:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create modulo" },
      { status: 500 }
    );
  }
}
