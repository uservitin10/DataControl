import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { apiSuccess, apiInternalError, apiValidationError } from "@/lib/api-response";
import { addAuditLog } from "@/lib/audit";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const redirectTo = typeof body?.redirectTo === "string" ? body.redirectTo.trim() : "";

    if (!email) {
      return apiValidationError("Email é obrigatório.");
    }

    const result = await pool.query(
      "SELECT id, email FROM profiles WHERE email = $1",
      [email]
    );

    const profile = result.rows[0] ?? null;

    if (profile?.id) {
      const resetToken = crypto.randomUUID();
      await pool.query(
        "INSERT INTO password_reset_tokens (user_id, token, expires_at, used) VALUES ($1, $2, NOW() + interval '1 hour', false)",
        [profile.id, resetToken]
      );

      const fallbackBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
      const normalizedRedirectTo = (redirectTo || fallbackBaseUrl).trim().replace(/\/$/, "");
      const resetPath = normalizedRedirectTo.includes("/login/reset")
        ? normalizedRedirectTo
        : `${normalizedRedirectTo}/login/reset`;
      const resetUrl = `${resetPath}?token=${encodeURIComponent(resetToken)}`;
      try {
        await sendPasswordResetEmail(email, resetUrl);
      } catch (emailError) {
        console.error("Falha ao enviar email de recuperação de senha:", emailError);
        throw emailError;
      }

      await addAuditLog({
        user_id: profile.id,
        action: "password_reset_requested",
        resource_type: "auth",
        details: `password reset requested for email:${email}`,
      });
    } else {
      await addAuditLog({
        user_id: null,
        action: "password_reset_requested",
        resource_type: "auth",
        details: `password reset requested for email:${email}`,
      });
    }

    return apiSuccess({ success: true });
  } catch (err) {
    return apiInternalError((err as Error).message);
  }
}
