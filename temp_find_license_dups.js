const fs = require('fs');
const data = JSON.parse(fs.readFileSync('src/data/inventario.json', 'utf8'));

const isActiveLicense = (item) => {
  const type = (item.type || '').toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const state = (item.equipment_state || item.equipmentState || '').toString().toLowerCase();
  return type === 'licenca' && ['ativa', 'ativo'].includes(state);
};

const normalize = (value) =>
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();

const licenses = data.filter(isActiveLicense);
console.log('Licenças ativas totais:', licenses.length);

const groups = new Map();
licenses.forEach((item) => {
  const key = [
    normalize(item.model),
    normalize(item.responsible),
    normalize(item.assetId || item.asset_id),
    normalize(item.equipmentId || item.equipment_id),
    normalize(item.notes),
  ]
    .filter(Boolean)
    .join('|');

  const list = groups.get(key) || [];
  list.push(item);
  groups.set(key, list);
});

const duplicates = Array.from(groups.entries())
  .filter(([, items]) => items.length > 1)
  .map(([key, items]) => ({ key, count: items.length, items }));

console.log('Grupos duplicados encontrados:', duplicates.length);
if (duplicates.length === 0) {
  process.exit(0);
}

duplicates.sort((a, b) => b.count - a.count);
duplicates.slice(0, 100).forEach((group, index) => {
  console.log(`\n=== Grupo ${index + 1} (${group.count}) ===`);
  group.items.forEach((item) => {
    console.log(`ID:${item.id} model:"${item.model}" responsible:"${item.responsible}" assetId:"${item.assetId || item.asset_id}" equipmentId:"${item.equipmentId || item.equipment_id}" notes:"${item.notes || ''}"`);
  });
});
