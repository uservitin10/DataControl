import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { apiSuccess, apiInternalError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  return withAuth(
    req,
    async () => {
      try {
        const url = new URL(req.url);
        const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);
        const offset = parseInt(url.searchParams.get("offset") ?? "0");

        const countResult = await pool.query("SELECT COUNT(*)::int AS total FROM profiles");
        const dataResult = await pool.query(
          `SELECT id, email, display_name, role, created_at
           FROM profiles
           ORDER BY created_at DESC
           LIMIT $1 OFFSET $2`,
          [limit, offset]
        );

        return apiSuccess({ data: dataResult.rows ?? [], total: countResult.rows[0]?.total ?? 0 });
      } catch (err) {
        return apiInternalError((err as Error).message);
      }
    },
    ["admin"]
  );
}