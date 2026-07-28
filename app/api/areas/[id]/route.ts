// app/api/areas/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/api-guard";
import pool from "@/lib/db";

// GET - Fetch single area (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await validateAuth(request, {
      module: "areas",
      action: "view",
    });

    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const result = await pool.query(
      "SELECT * FROM areas WHERE id = $1 LIMIT 1",
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Area not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching area:", error);
    return NextResponse.json(
      { error: "Area not found" },
      { status: 404 }
    );
  }
}

// PATCH - Update area (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await validateAuth(request, {
      module: "areas",
      action: "edit",
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
      `UPDATE areas
       SET nome = $1, descricao = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [nome.trim(), descricao?.trim() || null, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Area not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating area:", error);
    return NextResponse.json(
      { error: "Failed to update area" },
      { status: 500 }
    );
  }
}

// DELETE - Delete area (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await validateAuth(request, {
      module: "areas",
      action: "delete",
    });

    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    await pool.query("DELETE FROM areas WHERE id = $1", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting area:", error);
    return NextResponse.json(
      { error: "Failed to delete area" },
      { status: 500 }
    );
  }
}