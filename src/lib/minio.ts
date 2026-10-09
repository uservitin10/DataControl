import { S3Client } from "@aws-sdk/client-s3";

export function resolveMinioPresignEndpoint(env: Record<string, string | undefined> = process.env) {
  const publicUrl = env.MINIO_PUBLIC_URL?.trim();
  const endpoint = env.MINIO_ENDPOINT?.trim();
  return (publicUrl && publicUrl.replace(/\/$/, "")) || endpoint || "";
}

const minioAccessKey = process.env.MINIO_ACCESS_KEY?.trim();
const minioSecretKey = process.env.MINIO_SECRET_KEY?.trim();
const credentials = minioAccessKey && minioSecretKey
  ? {
      accessKeyId: minioAccessKey,
      secretAccessKey: minioSecretKey,
    }
  : undefined;
const region = process.env.MINIO_REGION || "us-east-1";

export const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT?.trim() || undefined,
  region,
  ...(credentials ? { credentials } : {}),
  forcePathStyle: true,
});

export const s3PresignClient = new S3Client({
  endpoint: resolveMinioPresignEndpoint() || undefined,
  region,
  ...(credentials ? { credentials } : {}),
  forcePathStyle: true,
});

export const PUBLIC_BUCKETS = ["previews"];
