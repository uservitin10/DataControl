import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { apiSuccess, apiInternalError, apiValidationError, apiForbidden } from "@/lib/api-response";
import { sanitizeText } from "@/lib/text";

type Role = "admin" | "editor" | "viewer" | "painel_editor" | "sistema_editor" | "inventario_editor";

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

export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    if (user.role !== "admin") {
      return apiForbidden("Apenas administradores podem criar usuários.");
    }

    try {
      const body = await req.json();
      const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
      const displayName = typeof body?.display_name === "string" ? sanitizeText(body.display_name.trim()) : "";
      const password = typeof body?.password === "string" ? body.password.trim() : "";
      const role = typeof body?.role === "string" ? body.role : "viewer";
      const allowedRoles: Role[] = ["admin", "editor", "viewer", "painel_editor", "sistema_editor", "inventario_editor"];

      if (!email) {
        return apiValidationError("Email é obrigatório.");
      }

      if (!displayName) {
        return apiValidationError("Nome completo é obrigatório.");
      }

      if (displayName.split(/\s+/).filter(Boolean).length < 2) {
        return apiValidationError("Informe o nome completo com nome e sobrenome.");
      }

      if (!password || password.length < 6) {
        return apiValidationError("A senha precisa ter pelo menos 6 caracteres.");
      }

      if (!allowedRoles.includes(role as Role)) {
        return apiValidationError("Role inválida.");
      }

      const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      if (!emailRegex.test(email)) {
        return apiValidationError("Email inválido.");
      }

      const existingResult = await pool.query("SELECT id FROM profiles WHERE email = $1", [email]);
      if (existingResult.rows.length > 0) {
        return apiValidationError("Este email já está cadastrado.");
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const id = crypto.randomUUID();

      const result = await pool.query(
        `INSERT INTO profiles (id, email, display_name, role, password_hash, must_reset_password)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING id, email, display_name, role`,
        [id, email, displayName, role, hashedPassword]
      );

      const userCreated = result.rows[0];
      return apiSuccess(userCreated ?? { id, email, display_name: displayName, role });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, ["admin"]);
}