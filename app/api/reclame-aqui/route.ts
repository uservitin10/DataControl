import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-guard";
import { apiCreated, apiInternalError, apiValidationError } from "@/lib/api-response";
import { sanitizeText } from "@/lib/text";

export async function POST(req: NextRequest) {
  return withAuth(req, async () => {
    try {
      const body = await req.json();
      const tipo = sanitizeText(body.tipo || "Reclame aqui");
      const mensagem = sanitizeText(body.mensagem || "");

      if (!mensagem) {
        return apiValidationError("A mensagem da reclamação é obrigatória.");
      }

      const { data, error } = await supabaseServer
        .from("notificacoes")
        .insert({
          tipo,
          mensagem,
          lida: false,
        })
        .select()
        .single();

      if (error) {
        return apiInternalError(error.message);
      }

      return apiCreated(data);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}
