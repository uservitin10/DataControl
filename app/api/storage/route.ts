import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/supabase-server";

const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 });

const formatStorageError = (error: any, bucket: string) => {
  const message = error?.message || "Erro no storage.";
  if (message.toLowerCase().includes("bucket not found")) {
    return `Bucket '${bucket}' não encontrado. Verifique se o bucket existe no Supabase.`;
  }
  return message;
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const bucket = url.searchParams.get("bucket");
  const path = url.searchParams.get("path");
  const expires = Number(url.searchParams.get("expires") ?? 3600);

  if (!type || !bucket || !path) {
    return badRequest("Parâmetros de storage inválidos.");
  }

  if (type === "public") {
    const data = supabaseServer.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ publicUrl: data.data.publicUrl });
  }

  if (type === "signed") {
    const { data, error } = await supabaseServer.storage.from(bucket).createSignedUrl(path, expires);
    if (error) {
      return NextResponse.json({ error: formatStorageError(error, bucket) }, { status: 500 });
    }
    return NextResponse.json({ signedUrl: data.signedUrl });
  }

  return badRequest("Tipo de storage inválido. Use 'public' ou 'signed'.");
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const bucket = formData.get("bucket");
  const path = formData.get("path");
  const file = formData.get("file");

  if (!bucket || !path || !file || !(file instanceof Blob)) {
    return badRequest("Dados de upload inválidos.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const fileData = new Uint8Array(arrayBuffer);

  const { error } = await supabaseServer.storage.from(String(bucket)).upload(String(path), fileData, { upsert: true });
  if (error) {
    return NextResponse.json({ error: formatStorageError(error, String(bucket)) }, { status: 500 });
  }

  return NextResponse.json({ bucket, path }, { status: 201 });
}

export async function DELETE(req: Request) {
  const body = await req.json();
  const bucket = body.bucket;
  const path = body.path;

  if (!bucket || !path) {
    return badRequest("Dados de exclusão inválidos.");
  }

  const { error } = await supabaseServer.storage.from(bucket).remove([path]);
  if (error) {
    return NextResponse.json({ error: formatStorageError(error, bucket) }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
