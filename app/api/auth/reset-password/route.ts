import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { apiSuccess, apiValidationError, apiInternalError } from "@/lib/api-response";
import { addAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const password = typeof body?.password === "string" ? body.password.trim() : "";

  if (!token) {
    return apiValidationError("Token de recuperação não encontrado.");
  }

  if (!password || password.length < 6) {
    return apiValidationError("A senha precisa ter pelo menos 6 caracteres.");
  }

  try {
    const tokenResult = await pool.query(
      "SELECT user_id FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW()",
      [token]
    );

    const tokenRow = tokenResult.rows[0];
    if (!tokenRow) {
      return apiValidationError("Token inválido ou expirado.");
    }

    const userId = tokenRow.user_id as string;
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query("BEGIN");
    try {
      await pool.query(
        "UPDATE profiles SET password_hash = $1, must_reset_password = false, password_updated_at = NOW() WHERE id = $2",
        [hashedPassword, userId]
      );
      await pool.query(
        "UPDATE password_reset_tokens SET used = true WHERE token = $1",
        [token]
      );
      await addAuditLog({
        user_id: userId,
        action: "password_reset_completed",
        resource_type: "auth",
        details: "password reset completed",
      });
      await pool.query("COMMIT");
    } catch (innerError) {
      await pool.query("ROLLBACK");
      throw innerError;
    }

    return apiSuccess({ success: true });
  } catch (error) {
    return apiInternalError((error as Error).message);
  }
}
