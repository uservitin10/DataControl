import { supabaseServer } from "@/lib/supabase-server";
import { sanitizeText } from "@/lib/text";
import type { Role } from "@/types/dashboard";

export type ProfileRecord = {
  role: Role;
  display_name: string;
};

export async function getProfileById(id: string): Promise<ProfileRecord | null> {
  const { data, error } = await supabaseServer
    .from("profiles")
    .select("role, display_name")
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }

  return data
    ? {
        ...data,
        display_name: sanitizeText(data.display_name || ""),
      }
    : null;
}
