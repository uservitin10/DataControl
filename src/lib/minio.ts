import { S3Client } from "@aws-sdk/client-s3";

export function resolveMinioPresignEndpoint(env: Record<string, string | undefined> = process.env) {
  return env.MINIO_PUBLIC_URL?.trim().replace(/\/$/, "") || env.MINIO_ENDPOINT;
}

const credentials = {
  accessKeyId: process.env.MINIO_ACCESS_KEY!,
  secretAccessKey: process.env.MINIO_SECRET_KEY!,
};
const region = process.env.MINIO_REGION || "us-east-1";

export const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  region,
  credentials,
  forcePathStyle: true,
});

export const s3PresignClient = new S3Client({
  endpoint: resolveMinioPresignEndpoint(),
  region,
  credentials,
  forcePathStyle: true,
});

export const PUBLIC_BUCKETS = ["previews"];
