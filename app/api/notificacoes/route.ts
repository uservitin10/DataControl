import { NextRequest } from "next/server";
import { supabaseServer } from "@/src/lib/supabase-server";
import { withAuth } from "@/src/lib/api-guard";
import { validateObject, sanitizeObject, VALIDATION_SCHEMAS, ALLOWED_NOTIFICACAO_FIELDS } from "@/src/lib/validation";
import { apiSuccess, apiCreated, apiValidationError, apiInternalError } from "@/src/lib/api-response";

export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
    try {
      const { data, error } = await supabaseServer
        .from("notificacoes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

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
      const validationError = validateObject(body, VALIDATION_SCHEMAS.criarNotificacao);
      if (validationError) {
        return apiValidationError(validationError);
      }

      // Limpar e manter apenas campos permitidos
      const cleanBody = sanitizeObject(body, ALLOWED_NOTIFICACAO_FIELDS);
      
      const { data, error } = await supabaseServer.from("notificacoes").insert(cleanBody);
      if (error) {
        return apiInternalError(error.message);
      }

      return apiCreated(data);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, ["admin", "editor"]);
}

export async function PATCH(request: NextRequest) {
  return withAuth(request, async () => {
    try {
      const { error } = await supabaseServer
        .from("notificacoes")
        .update({ lida: true })
        .eq("lida", false);

      if (error) {
        return apiInternalError(error.message);
      }

      return apiSuccess({ success: true });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}
