import { withAuthenticatedClient } from "@/lib/db";
import { sanitizeText } from "@/lib/text";
import type { Role } from "@/types/dashboard";

export type ProfileRecord = {
  role: Role;
  display_name: string;
};

export async function getProfileById(id: string): Promise<ProfileRecord | null> {
  const data = await withAuthenticatedClient(
    { id, role: "" }, // contexto mínimo: a policy select_own_profile libera quando auth.uid() = id
    async (client) => {
      const result = await client.query(
        `SELECT role, display_name FROM profiles WHERE id = $1`,
        [id]
      );
      return result.rows[0] ?? null;
    }
  );

  return data
    ? {
        role: data.role,
        display_name: sanitizeText(data.display_name || ""),
      }
    : null;
}