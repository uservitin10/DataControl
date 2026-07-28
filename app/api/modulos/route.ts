import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/api-guard";
import pool from "@/lib/db";

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

    const result = await pool.query(
      "SELECT * FROM modulos ORDER BY nome ASC"
    );

    return NextResponse.json(result.rows || []);
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

    const result = await pool.query(
      `INSERT INTO modulos (nome, descricao, created_at)
       VALUES ($1, $2, NOW())
       RETURNING *`,
      [nome.trim(), descricao?.trim() || null]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating modulo:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create modulo" },
      { status: 500 }
    );
  }
}
