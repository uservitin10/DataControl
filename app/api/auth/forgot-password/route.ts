import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { apiSuccess, apiInternalError, apiValidationError } from "@/lib/api-response";
import { addAuditLog } from "@/lib/audit";
import { sendPasswordResetEmail } from "@/lib/email";

export function sanitizeRedirectUrl(rawRedirectTo: string, fallbackBaseUrl: string): string {
  const safeFallbackBase = (fallbackBaseUrl || "https://localhost").trim().replace(/\/$/, "");

  try {
    const baseUrl = new URL(safeFallbackBase);
    const candidate = rawRedirectTo ? new URL(rawRedirectTo, baseUrl.href) : new URL(baseUrl.href);

    if (candidate.origin !== baseUrl.origin) {
      return `${baseUrl.origin}/login/reset`;
    }

    const normalized = candidate.toString().replace(/\/$/, "");
    if (!rawRedirectTo || rawRedirectTo.trim() === "") {
      return `${baseUrl.origin}/login/reset`;
    }

    if (candidate.pathname === "/" && !candidate.search && !candidate.hash) {
      return `${baseUrl.origin}/login/reset`;
    }

    return normalized;
  } catch {
    return `${safeFallbackBase}/login/reset`;
  }
}

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

      const fallbackBaseUrl = (
        process.env.AUTH_URL ||
        process.env.NEXTAUTH_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://localhost"
      ).trim().replace(/\/$/, "");
      const normalizedRedirectTo = sanitizeRedirectUrl(redirectTo || fallbackBaseUrl, fallbackBaseUrl);
      const separator = normalizedRedirectTo.includes("?") ? "&" : "?";
      const resetUrl = `${normalizedRedirectTo}${separator}token=${encodeURIComponent(resetToken)}`;
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
