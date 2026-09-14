import { NextRequest, NextResponse } from "next/server";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/minio";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { apiSuccess, apiValidationError, apiInternalError } from "@/lib/api-response";

const isBinaryContentType = (contentType: string | null) => {
  if (!contentType) return true;
  return !contentType.startsWith("text/") && !contentType.includes("json") && !contentType.includes("xml");
};

const formatStorageError = (error: unknown, bucket: string) => {
  const message = (error as { message?: string; name?: string })?.message || "Erro no storage.";
  if (message.toLowerCase().includes("nosuchbucket") || message.toLowerCase().includes("bucket not found")) {
    return `Bucket '${bucket}' não encontrado. Verifique se o bucket existe no MinIO.`;
  }
  return message;
};

const getMinioPublicUrl = (bucket: string, path: string) => {
  const base = process.env.MINIO_PUBLIC_URL?.replace(/\/$/, "") ?? "";
  return `${base}/${bucket}/${path}`;
};

async function getObjectBodyBytes(response: GetObjectCommandOutput) {
  const body = response.Body;
  if (!body) {
    return null;
  }

  if (typeof body === "string") {
    return Buffer.from(body);
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  const bodyWithConverters = body as unknown as {
    transformToByteArray?: () => Promise<Uint8Array>;
    arrayBuffer?: () => Promise<ArrayBuffer>;
  };
  if (typeof bodyWithConverters.transformToByteArray === "function") {
    return Buffer.from(await bodyWithConverters.transformToByteArray());
  }

  if (typeof bodyWithConverters.arrayBuffer === "function") {
    const arrayBuffer = await bodyWithConverters.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

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
        return apiSuccess({ publicUrl: getMinioPublicUrl(bucket, path) });
      }

      if (type === "signed") {
        try {
          const command = new GetObjectCommand({ Bucket: bucket, Key: path });
          const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: expires });
          return apiSuccess({ signedUrl });
        } catch (error) {
          return apiInternalError(formatStorageError(error, bucket));
        }
      }

      if (type === "proxy") {
        try {
          const response = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: path }));
          const buffer = await getObjectBodyBytes(response);
          if (!buffer) {
            return apiInternalError(`Arquivo '${path}' não pôde ser baixado.`);
          }

          const contentType = (response.ContentType as string) || "application/octet-stream";
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "private, max-age=0, no-store",
              ...(isBinaryContentType(contentType)
                ? { "Content-Disposition": `inline; filename="${path.split("/").pop() ?? "file"}"` }
                : {}),
            },
          });
        } catch (error) {
          return apiInternalError(formatStorageError(error, bucket));
        }
      }

      return apiValidationError("Tipo de storage inválido. Use 'public' ou 'signed'.");
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "dashboard", action: "view" });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      const formData = await req.formData();
      const bucket = formData.get("bucket");
      const path = formData.get("path");
      const file = formData.get("file");

      if (!bucket || !path || !file || !(file instanceof Blob)) {
        return apiValidationError("Dados de upload inválidos.");
      }

      const arrayBuffer = await file.arrayBuffer();
      const fileData = Buffer.from(arrayBuffer);
      const contentType = file.type || "application/octet-stream";

      try {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: String(bucket),
            Key: String(path),
            Body: fileData,
            ContentType: contentType,
          })
        );
      } catch (error) {
        return apiInternalError(formatStorageError(error, String(bucket)));
      }

      await addAuditLog({
        user_id: user.id,
        action: "upload_storage",
        resource_type: "storage",
        resource_id: `${String(bucket)}/${String(path)}`,
        details: `Upload de arquivo no bucket ${String(bucket)} em ${String(path)}`,
      });

      return apiSuccess({ bucket, path }, 201);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "dashboard", action: "edit" });
}

export async function DELETE(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      const body = await req.json();
      const bucket = body.bucket;
      const path = body.path;

      if (!bucket || !path) {
        return apiValidationError("Dados de exclusão inválidos.");
      }

      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: String(bucket), Key: String(path) }));
      } catch (error) {
        return apiInternalError(formatStorageError(error, String(bucket)));
      }

      await addAuditLog({
        user_id: user.id,
        action: "delete_storage",
        resource_type: "storage",
        resource_id: `${String(bucket)}/${String(path)}`,
        details: `Remoção de arquivo no bucket ${String(bucket)} em ${String(path)}`,
      });

      return apiSuccess({ success: true });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "dashboard", action: "delete" });
}
