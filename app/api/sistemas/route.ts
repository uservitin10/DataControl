import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { withAuth, withOptionalAuth } from "@/lib/api-guard";
import { validateObject, sanitizeObject, VALIDATION_SCHEMAS, ALLOWED_SISTEMA_FIELDS } from "@/lib/validation";
import { apiSuccess, apiCreated, apiValidationError, apiInternalError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  return withOptionalAuth(request, async (user) => {
    try {
      let query = supabaseServer
        .from("sistemas")
        .select("*")
        .order("created_at", { ascending: false });

      // Para visitantes e viewers, mostrar apenas sistemas públicos com produção disponível
      if (!user.id || user.role === "viewer") {
        query = query
          .eq("tipo_acesso", "publico")
          .not("url_producao", "is", null)
          .neq("url_producao", "");
      }

      const { data, error } = await query;

      if (error) {
        return apiInternalError(error.message);
      }

      return apiSuccess(data ?? []);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async () => {
    try {
      const body = await req.json();
      
      // Validar usando schema reutilizável
      const validationError = validateObject(body, VALIDATION_SCHEMAS.criarSistema);
      if (validationError) {
        return apiValidationError(validationError);
      }

      // Limpar e manter apenas campos permitidos
      const cleanBody = sanitizeObject(body, ALLOWED_SISTEMA_FIELDS);
      
      const { data, error } = await supabaseServer.from("sistemas").insert(cleanBody);
      if (error) {
        return apiInternalError(error.message);
      }

      return apiCreated(data);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "sistemas", action: "edit" });
}
