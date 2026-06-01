import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-guard";
import { apiSuccess, apiValidationError, apiInternalError } from "@/lib/api-response";

const formatStorageError = (error: any, bucket: string) => {
  const message = error?.message || "Erro no storage.";
  if (message.toLowerCase().includes("bucket not found")) {
    return `Bucket '${bucket}' não encontrado. Verifique se o bucket existe no Supabase.`;
  }
  return message;
};

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    try {
      const url = new URL(req.url);
      const type = url.searchParams.get("type");
      const bucket = url.searchParams.get("bucket");
      const path = url.searchParams.get("path");
      const expires = Number(url.searchParams.get("expires") ?? 3600);

      if (!type || !bucket || !path) {
        return apiValidationError("Parâmetros de storage inválidos.");
      }

      if (type === "public") {
        const data = supabaseServer.storage.from(bucket).getPublicUrl(path);
        return apiSuccess({ publicUrl: data.data.publicUrl });
      }

      if (type === "signed") {
        const { data, error } = await supabaseServer.storage.from(bucket).createSignedUrl(path, expires);
        if (error) {
          return apiInternalError(formatStorageError(error, bucket));
        }
        return apiSuccess({ signedUrl: data.signedUrl });
      }

      return apiValidationError("Tipo de storage inválido. Use 'public' ou 'signed'.");
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "dashboard", action: "view" });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async () => {
    try {
      const formData = await req.formData();
      const bucket = formData.get("bucket");
      const path = formData.get("path");
      const file = formData.get("file");

      if (!bucket || !path || !file || !(file instanceof Blob)) {
        return apiValidationError("Dados de upload inválidos.");
      }

      const arrayBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      const { error } = await supabaseServer.storage.from(String(bucket)).upload(String(path), fileData, { upsert: true });
      if (error) {
        return apiInternalError(formatStorageError(error, String(bucket)));
      }

      return apiSuccess({ bucket, path }, 201);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "dashboard", action: "edit" });
}

export async function DELETE(req: NextRequest) {
  return withAuth(req, async () => {
    try {
      const body = await req.json();
      const bucket = body.bucket;
      const path = body.path;

      if (!bucket || !path) {
        return apiValidationError("Dados de exclusão inválidos.");
      }

      const { error } = await supabaseServer.storage.from(bucket).remove([path]);
      if (error) {
        return apiInternalError(formatStorageError(error, bucket));
      }

      return apiSuccess({ success: true });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "dashboard", action: "delete" });
}
