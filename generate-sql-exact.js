const inv = require('./src/data/inventario.json');

// Os IDs exatos das 13 licenças que preenchemos
const exactIds = [426, 427, 429, 430, 431, 433, 435, 436, 437, 438, 458, 467, 468];

const recentLicenses = inv.filter(item => exactIds.includes(item.id));

console.log('-- SQL INSERT para as 13 licenças com assetId preenchido\n');
recentLicenses.forEach(l => {
  const type = (l.type || '').replace(/'/g, "''");
  const model = (l.model || '').replace(/'/g, "''");
  const serial = (l.serialNumber || '').replace(/'/g, "''");
  const asset = (l.assetId || '').replace(/'/g, "''");
  const equip = (l.equipmentId || '').replace(/'/g, "''");
  const assetType = (l.assetType || '').replace(/'/g, "''");
  const macIp = (l.macIp || '').replace(/'/g, "''");
  const responsible = (l.responsible || '').replace(/'/g, "''");
  const sector = (l.sector || '').replace(/'/g, "''");
  const warranty = (l.warranty || '').replace(/'/g, "''");
  const state = (l.equipmentState || '').toLowerCase() === 'ativa' ? 'ativa' : 'inativa';
  const notes = (l.notes || '').replace(/'/g, "''");

  console.log(`INSERT INTO inventory_items (type, model, serial_number, asset_id, equipment_id, asset_type, mac_ip, responsible, sector, warranty, equipment_state, notes) VALUES ('${type}', '${model}', '${serial}', '${asset}', '${equip}', '${assetType}', '${macIp}', '${responsible}', '${sector}', '${warranty}', '${state}', '${notes}');`);
});

console.log(`\n-- Total: ${recentLicenses.length} licenças para inserir`);
