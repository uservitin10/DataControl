import bcrypt from "bcryptjs";
import type { NextAuthRequest } from "next-auth";
import { auth } from "@/auth";
import { apiSuccess, apiValidationError, apiUnauthorized, apiInternalError } from "@/lib/api-response";
import { withAuthenticatedClient } from "@/lib/db";
import { getProfileById } from "@/lib/profile";

export const GET = auth(async (req: NextAuthRequest) => {
  const userId = req.auth?.user?.id;

  if (!userId) {
    return apiUnauthorized();
  }

  const profile = await getProfileById(userId);
  if (!profile) {
    return apiInternalError("Perfil de usuário não encontrado.");
  }

  return apiSuccess({
    role: profile.role,
    display_name: profile.display_name,
  });
});

export const PATCH = auth(async (req: NextAuthRequest) => {
  const userId = req.auth?.user?.id;
  const userRole = req.auth?.user?.role ?? "viewer";

  if (!userId) {
    return apiUnauthorized();
  }

  const body = await req.json();
  const { email, display_name, password } = body as {
    email?: string;
    display_name?: string;
    password?: string;
  };

  if (!email && display_name === undefined && !password) {
    return apiValidationError("Nenhum campo para atualizar.");
  }

  try {
    await withAuthenticatedClient({ id: userId, role: userRole }, async (client) => {
      const updates: Array<{ query: string; params: Array<string> }> = [];

      if (email) {
        updates.push({ query: "UPDATE profiles SET email = $1 WHERE id = $2", params: [email, userId] });
      }

      if (display_name !== undefined) {
        updates.push({ query: "UPDATE profiles SET display_name = $1 WHERE id = $2", params: [display_name, userId] });
      }

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updates.push({ query: "UPDATE profiles SET password_hash = $1 WHERE id = $2", params: [hashedPassword, userId] });
      }

      for (const update of updates) {
        await client.query(update.query, update.params);
      }
    });

    return apiSuccess({ success: true });
  } catch (error) {
    return apiInternalError((error as Error).message);
  }
});
