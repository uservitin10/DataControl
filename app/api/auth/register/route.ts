import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { apiSuccess, apiValidationError, apiInternalError } from "@/lib/api-response";
import { sanitizeText } from "@/lib/text";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password.trim() : "";
    const displayName = typeof body?.displayName === "string" ? sanitizeText(body.displayName.trim()) : "";

    if (!email) {
      return apiValidationError("Email é obrigatório.");
    }

    if (!displayName) {
      return apiValidationError("Nome completo é obrigatório.");
    }

    if (displayName.split(/\s+/).filter(Boolean).length < 2) {
      return apiValidationError("Informe o nome completo, com nome e sobrenome.");
    }

    if (!password || password.length < 6) {
      return apiValidationError("A senha precisa ter pelo menos 6 caracteres.");
    }

    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(email)) {
      return apiValidationError("Email inválido.");
    }

    const existingResult = await pool.query(
      "SELECT id FROM profiles WHERE email = $1",
      [email]
    );

    if (existingResult.rows.length > 0) {
      return apiValidationError("Este email já está cadastrado.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO profiles (id, email, display_name, role, password_hash, must_reset_password)
       VALUES ($1, $2, $3, 'viewer', $4, false)`,
      [id, email, displayName, hashedPassword]
    );

    return apiSuccess({ success: true });
  } catch (err) {
    return apiInternalError((err as Error).message);
  }
}
