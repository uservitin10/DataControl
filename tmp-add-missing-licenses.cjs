const fs = require('fs');

const inventoryPath = 'src/data/inventario.json';
const missingPath = 'tmp-missing-licenses.json';

const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const missing = JSON.parse(fs.readFileSync(missingPath, 'utf8'));

const existingEmails = new Set(
  inventory
    .filter((item) => item.type === 'Licença')
    .map((item) => String(item.assetId || item.asset_id || '').trim().toLowerCase())
    .filter(Boolean)
);

let nextId = inventory.reduce((max, item) => Math.max(max, Number(item.id || 0)), 0) + 1;
const additions = [];

for (const item of missing) {
  const email = String(item.email || '').trim().toLowerCase();
  if (!email || existingEmails.has(email)) {
    continue;
  }

  const entry = {
    id: nextId++,
    type: 'Licença',
    model: item.model,
    assetType: 'SW',
    assetId: item.email,
    equipmentId: '',
    macIp: '',
    sector: '',
    responsible: item.responsible,
    allocatedUser: '',
    warranty: '',
    equipmentState: 'Ativa',
    notes: `${item.model} atribuída`
  };

  inventory.push(entry);
  existingEmails.add(email);
  additions.push(entry);
}

fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2) + '\n', 'utf8');

console.log(`Added ${additions.length} missing license entries to ${inventoryPath}`);
additions.forEach((item) => console.log(`- ${item.id} | ${item.model} | ${item.responsible} | ${item.assetId}`));
