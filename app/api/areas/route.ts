import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/api-guard";
import pool from "@/lib/db";

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

    const result = await pool.query(
      "SELECT * FROM areas ORDER BY nome ASC"
    );

    return NextResponse.json(result.rows || []);
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

    const result = await pool.query(
      `INSERT INTO areas (nome, descricao, created_at)
       VALUES ($1, $2, NOW())
       RETURNING *`,
      [nome.trim(), descricao?.trim() || null]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating area:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create area" },
      { status: 500 }
    );
  }
}