const fs = require('fs');
const inventory = JSON.parse(fs.readFileSync('src/data/inventario.json', 'utf8'));
const missing = JSON.parse(fs.readFileSync('tmp-missing-licenses.json', 'utf8'));
const inventoryEmails = new Set(inventory.map(item => String(item.assetId || item.asset_id || '').toLowerCase().trim()).filter(Boolean));
for (const item of missing) {
  console.log(item.email, inventoryEmails.has(item.email));
}
