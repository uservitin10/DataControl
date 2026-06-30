import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { apiSuccess, apiInternalError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { data: sageDesktops, error: fetchError } = await supabaseServer
      .from("inventory_items")
      .select("*")
      .eq("sector", "SAGE")
      .eq("type", "Desktop")
      .order("id", { ascending: true });

    if (fetchError) {
      return apiInternalError(`Erro: ${fetchError.message}`);
    }

    return apiSuccess({
      count: sageDesktops?.length || 0,
      desktops: sageDesktops,
    });
  } catch (error) {
    return apiInternalError(`Erro: ${(error as Error).message}`);
  }
}
