import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/api-guard";
import { supabaseServer } from "@/lib/supabase-server";

// GET - List all areas (admin only)
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
      .from("areas")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      throw new Error(error.message || JSON.stringify(error));
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching areas:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch areas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Create new area (admin only)
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
      .from("areas")
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
    console.error("Error creating area:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create area" },
      { status: 500 }
    );
  }
}