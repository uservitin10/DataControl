import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { apiInternalError, apiNotFound, apiSuccess, apiValidationError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  return withAuth(req, async (admin) => {
    try {
      const body = await req.json().catch(() => null);
      const password = typeof body?.password === "string" ? body.password.trim() : "";
      if (password.length < 6) {
        return apiValidationError("A senha precisa ter pelo menos 6 caracteres.");
      }

      const { id } = await params;
      const profileResult = await pool.query(
        "SELECT id, email FROM profiles WHERE id = $1",
        [id]
      );
      const profile = profileResult.rows[0] as { id: string; email: string } | undefined;

      if (!profile) {
        return apiNotFound("Usuário não encontrado.");
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `UPDATE profiles
           SET password_hash = $1, must_reset_password = false, password_updated_at = NOW()
           WHERE id = $2`,
          [passwordHash, profile.id]
        );
        await client.query(
          "UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false",
          [profile.id]
        );
        await client.query("COMMIT");
      } catch (updateError) {
        await client.query("ROLLBACK");
        throw updateError;
      } finally {
        client.release();
      }

      await addAuditLog({
        user_id: admin.id,
        action: "admin_password_reset_completed",
        resource_type: "profile",
        resource_id: profile.id,
        details: "Admin definiu manualmente uma nova senha para o usuário.",
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      });

      return apiSuccess({ success: true, email: profile.email });
    } catch (error) {
      return apiInternalError((error as Error).message);
    }
  }, ["admin"]);
}

export async function GET(req: NextRequest, { params }: Params) {
  return withAuth(req, async () => {
    try {
      const { id } = await params;
      const result = await pool.query(
        "SELECT id, email, display_name FROM profiles WHERE id = $1",
        [id]
      );
      const profile = result.rows[0];
      if (!profile) return apiNotFound("Usuário não encontrado.");
      return apiSuccess(profile);
    } catch (error) {
      return apiInternalError((error as Error).message);
    }
  }, ["admin"]);
}