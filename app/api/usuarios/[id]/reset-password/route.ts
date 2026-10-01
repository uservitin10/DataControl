import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { apiInternalError, apiNotFound, apiSuccess } from "@/lib/api-response";
import { sendPasswordResetEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  return withAuth(req, async (admin) => {
    try {
      const { id } = await params;
      const profileResult = await pool.query(
        "SELECT id, email FROM profiles WHERE id = $1",
        [id]
      );
      const profile = profileResult.rows[0] as { id: string; email: string } | undefined;

      if (!profile) {
        return apiNotFound("Usuário não encontrado.");
      }

      const token = crypto.randomUUID();
      await pool.query(
        "INSERT INTO password_reset_tokens (user_id, token, expires_at, used) VALUES ($1, $2, NOW() + interval '1 hour', false)",
        [profile.id, token]
      );

      const appUrl =
        process.env.AUTH_URL ||
        process.env.NEXTAUTH_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://localhost";
      const resetUrl = new URL("/login/reset", appUrl);
      resetUrl.searchParams.set("token", token);

      try {
        await sendPasswordResetEmail(profile.email, resetUrl.toString());
      } catch (emailError) {
        await pool.query(
          "UPDATE password_reset_tokens SET used = true WHERE token = $1",
          [token]
        );
        throw emailError;
      }

      await addAuditLog({
        user_id: admin.id,
        action: "admin_password_reset_requested",
        resource_type: "profile",
        resource_id: profile.id,
        details: "Admin enviou um link de redefinição de senha.",
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      });

      return apiSuccess({ success: true });
    } catch (error) {
      return apiInternalError((error as Error).message);
    }
  }, ["admin"]);
}