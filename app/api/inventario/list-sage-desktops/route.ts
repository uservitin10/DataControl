import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { apiSuccess, apiInternalError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const result = await pool.query(
      `SELECT * FROM inventory_items
       WHERE sector = $1 AND type = $2
       ORDER BY id ASC`,
      ["SAGE", "Desktop"]
    );

    return apiSuccess({
      count: result.rows.length,
      desktops: result.rows,
    });
  } catch (error) {
    return apiInternalError(`Erro: ${(error as Error).message}`);
  }
}