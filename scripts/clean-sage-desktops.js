import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function cleanSageDesktops() {
  console.log("🔍 Buscando Desktops do setor SAGE sem informações...\n");

  // Buscar todos os desktops do setor SAGE
  const { data: sagDesktops, error: fetchError } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("sector", "SAGE")
    .eq("type", "Desktop")
    .order("created_at", { ascending: true });

  if (fetchError) {
    console.error("❌ Erro ao buscar desktops:", fetchError.message);
    process.exit(1);
  }

  console.log(`Total de Desktops no SAGE: ${sagDesktops.length}\n`);

  // Filtrar apenas os que estão sem informações críticas
  const incompleteDesktops = sagDesktops.filter((desktop) => {
    const hasNoAssetId = !desktop.asset_id || desktop.asset_id.trim() === "";
    const hasNoEquipmentId = !desktop.equipment_id || desktop.equipment_id.trim() === "";
    const hasNoResponsible = !desktop.responsible || desktop.responsible.trim() === "";
    const hasNoAllocatedUser = !desktop.allocated_user && !desktop.allocated_user_id;
    const hasNoWarranty = !desktop.warranty || desktop.warranty.trim() === "";
    const hasNoState = !desktop.equipment_state || desktop.equipment_state.trim() === "";

    // Considerar incompleto se tiver múltiplos campos vazios
    const emptyFieldsCount = [
      hasNoAssetId,
      hasNoEquipmentId,
      hasNoResponsible,
      hasNoAllocatedUser,
      hasNoWarranty,
      hasNoState,
    ].filter(Boolean).length;

    return emptyFieldsCount >= 4; // Se tiver 4 ou mais campos vazios
  });

  console.log(`Desktops INCOMPLETOS encontrados: ${incompleteDesktops.length}\n`);

  if (incompleteDesktops.length === 0) {
    console.log("✅ Nenhum Desktop incompleto encontrado!");
    process.exit(0);
  }

  console.log("Detalhes dos Desktops a remover:");
  console.log("═".repeat(80));
  incompleteDesktops.forEach((desktop, index) => {
    console.log(`\n${index + 1}. ID: ${desktop.id}`);
    console.log(`   Modelo: ${desktop.model}`);
    console.log(`   Asset ID: ${desktop.asset_id || "❌ VAZIO"}`);
    console.log(`   Equipment ID: ${desktop.equipment_id || "❌ VAZIO"}`);
    console.log(`   Responsável: ${desktop.responsible || "❌ VAZIO"}`);
    console.log(
      `   Usuário Alocado: ${desktop.allocated_user || desktop.allocated_user_id || "❌ VAZIO"}`
    );
    console.log(`   Garantia: ${desktop.warranty || "❌ VAZIO"}`);
    console.log(`   Estado: ${desktop.equipment_state || "❌ VAZIO"}`);
    console.log(`   Criado em: ${new Date(desktop.created_at).toLocaleDateString("pt-BR")}`);
  });

  console.log("\n" + "═".repeat(80));
  console.log(
    `\n⚠️  ${incompleteDesktops.length} Desktop(s) será(ão) removido(s) do setor SAGE.\n`
  );

  // Perguntar confirmação
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Deseja prosseguir com a remoção? (sim/não): ", async (answer) => {
      rl.close();

      if (answer.toLowerCase() !== "sim") {
        console.log("\n❌ Operação cancelada.");
        process.exit(0);
      }

      // Executar deleção
      console.log("\n🗑️  Removendo Desktops incompletos...\n");

      const desktopIds = incompleteDesktops.map((d) => d.id);

      const { error: deleteError } = await supabase
        .from("inventory_items")
        .delete()
        .in("id", desktopIds);

      if (deleteError) {
        console.error("❌ Erro ao remover Desktops:", deleteError.message);
        process.exit(1);
      }

      console.log(`✅ ${incompleteDesktops.length} Desktop(s) removido(s) com sucesso!\n`);

      // Verificação final
      const { data: remainingDesktops } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("sector", "SAGE")
        .eq("type", "Desktop");

      console.log(
        `📊 Desktops restantes no SAGE: ${remainingDesktops?.length || 0}\n`
      );

      process.exit(0);
    });
  });
}

cleanSageDesktops().catch((error) => {
  console.error("❌ Erro fatal:", error);
  process.exit(1);
});
