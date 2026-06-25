const inv = require('./src/data/inventario.json');

// Os 13 nomes que preenchemos com emails
const namesWeJustFilled = [
  'Gustavo Bruzzeguez',
  'Everton Ramos',
  'Ramon Brandão',
  'Marcos Alsina',
  'Leandro Lira',
  'Wertiz Dantas da Silva Junior',
  'Mauro Tapajós Santos',
  'Monade Rassa Souza Costa',
  'Nelson Sattler da Fonseca',
  'Ricardo Tadeu de Albuquerque Peixoto',
  'Leonardo Mello', // Copilot Add-on
  'Rodolfo Vaz Oliveira Aguiar',
  'Thomaz Fronzaglia'
];

// Buscar as licenças que preenchemos
const recentLicenses = inv.filter(item =>
  item.type === 'Licença' &&
  item.equipmentState &&
  String(item.equipmentState).toLowerCase() === 'ativa' &&
  item.assetId &&
  String(item.assetId).trim() &&
  namesWeJustFilled.some(name => String(item.responsible || '').includes(name.split(' ')[0]) || item.responsible === name)
);

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

console.log('\n-- Total: ' + recentLicenses.length + ' licenças para inserir');
