import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-guard";
import { validateObject, sanitizeObject, VALIDATION_SCHEMAS, ALLOWED_SISTEMA_FIELDS } from "@/lib/validation";
import { apiSuccess, apiValidationError, apiNotFound, apiInternalError } from "@/lib/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async () => {
    try {
      const { id } = await params;

      const { data, error } = await supabaseServer
        .from("sistemas")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return apiNotFound("Sistema não encontrado");
      }

      return apiSuccess(data);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "sistemas", action: "view" });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async () => {
    try {
      const { id } = await params;
      const body = await req.json();

      // Validar usando schema reutilizável
      const validationError = validateObject(body, VALIDATION_SCHEMAS.atualizarSistema);
      if (validationError) {
        return apiValidationError(validationError);
      }

      // Limpar e manter apenas campos permitidos
      const patchBody = sanitizeObject(body, ALLOWED_SISTEMA_FIELDS);

      const { data, error } = await supabaseServer
        .from("sistemas")
        .update(patchBody)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return apiNotFound("Sistema não encontrado");
      }

      return apiSuccess(data);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "sistemas", action: "edit" });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async () => {
    try {
      const { id } = await params;
      
      const { error } = await supabaseServer.from("sistemas").delete().eq("id", id);

      if (error) {
        return apiNotFound("Sistema não encontrado");
      }

      return apiSuccess({ success: true });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "sistemas", action: "delete" });
}
