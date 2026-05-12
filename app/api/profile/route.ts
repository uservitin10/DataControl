import { NextRequest } from "next/server";
import { supabaseServer } from "@/src/lib/supabase-server";
import { withAuth } from "@/src/lib/api-guard";
import { apiSuccess, apiValidationError, apiNotFound, apiInternalError } from "@/src/lib/api-response";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    try {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");

      if (!id) {
        return apiValidationError("Id de usuário é obrigatório.");
      }

      const { data, error } = await supabaseServer
        .from("profiles")
        .select("role, display_name")
        .eq("id", id)
        .single();

      if (error) {
        return apiNotFound("Perfil não encontrado");
      }

      return apiSuccess(data);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}
