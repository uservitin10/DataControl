const { createClient } = require('@supabase/supabase-js');
const inventarioData = require('../src/data/inventario.json');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Erro: Variáveis de ambiente Supabase não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function syncLicensesToDatabase() {
  try {
    // Extrair licenças do JSON
    const licensesFromJson = inventarioData.filter(item => 
      item.type === 'Licença' && 
      item.equipmentState && 
      item.equipmentState.toLowerCase() === 'ativa'
    );

    console.log(`✓ Encontradas ${licensesFromJson.length} licenças ativas no JSON`);

    // Buscar licenças do banco
    const { data: licensesFromDb, error: fetchError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('type', 'Licença')
      .in('equipment_state', ['ativa', 'ativo']);

    if (fetchError) {
      throw new Error(`Erro ao buscar licenças do banco: ${fetchError.message}`);
    }

    console.log(`✓ Encontradas ${licensesFromDb.length} licenças ativas no banco`);

    // Criar um Set de chaves existentes no banco (modelo + email)
    const existingKeysInDb = new Set(
      licensesFromDb.map(license => {
        const modelKey = (license.model || '').toString().trim().toLowerCase();
        const assetKey = (license.asset_id || '').toString().trim().toLowerCase();
        return `${modelKey}|${assetKey}`;
      })
    );

    // Identificar licenças faltantes e remover duplicatas do próprio JSON
    const seenJsonKeys = new Set();
    const licensesToAdd = [];
    const duplicateJsonEntries = [];

    licensesFromJson.forEach(jsonLicense => {
      const modelKey = (jsonLicense.model || '').toString().trim().toLowerCase();
      const assetKey = (jsonLicense.assetId || '').toString().trim().toLowerCase();
      const key = `${modelKey}|${assetKey}`;

      if (!modelKey || !assetKey) {
        return;
      }

      if (existingKeysInDb.has(key)) {
        return;
      }

      if (seenJsonKeys.has(key)) {
        duplicateJsonEntries.push({
          id: jsonLicense.id,
          model: jsonLicense.model,
          assetId: jsonLicense.assetId,
          responsible: jsonLicense.responsible,
        });
        return;
      }

      seenJsonKeys.add(key);
      licensesToAdd.push(jsonLicense);
    });

    console.log(`\n⚠ Licenças faltando no banco: ${licensesToAdd.length}`);

    if (duplicateJsonEntries.length > 0) {
      console.warn(`⚠ ${duplicateJsonEntries.length} entradas duplicadas no JSON foram ignoradas.`);
      duplicateJsonEntries.slice(0, 20).forEach(entry => {
        console.warn(`  - DUPLICADO JSON: ${entry.model} | ${entry.responsible} | ${entry.assetId} (id=${entry.id})`);
      });
    }

    if (licensesToAdd.length === 0) {
      console.log('✓ Banco sincronizado com JSON!');
      return;
    }

    // Exibir licenças faltantes
    console.log('\nLicenças a sincronizar:');
    licensesToAdd.forEach(license => {
      console.log(`  - ${license.model} | ${license.responsible} | ${license.assetId}`);
    });

    // Inserir licenças faltantes (usar apenas campos seguros para evitar erro de coluna ausente)
    const itemsToInsert = licensesToAdd.map(jsonLicense => ({
      type: jsonLicense.type,
      model: jsonLicense.model,
      serial_number: jsonLicense.serialNumber || null,
      asset_id: jsonLicense.assetId || null,
      equipment_id: jsonLicense.equipmentId || null,
      asset_type: jsonLicense.assetType || null,
      mac_ip: jsonLicense.macIp || null,
      responsible: jsonLicense.responsible || null,
      sector: jsonLicense.sector || null,
      warranty: jsonLicense.warranty || null,
      equipment_state: 'ativa',
      notes: jsonLicense.notes || null,
    }));

    const { data: insertedItems, error: insertError } = await supabase
      .from('inventory_items')
      .insert(itemsToInsert)
      .select();

    if (insertError) {
      throw new Error(`Erro ao inserir licenças: ${insertError.message}`);
    }

    console.log(`\n✓ ${insertedItems.length} licenças inseridas com sucesso!`);
    console.log('\nTotal no banco agora: ' + (licensesFromDb.length + insertedItems.length) + ' licenças ativas');

  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

syncLicensesToDatabase();
