const fs = require('fs');
const path = 'src/data/inventario.json';
const backupPath = 'src/data/inventario.json.bak2';
const idsToRemove = [341,342,343,344,345,346,347,348,349,350,351,352,353,354,355,356,357,358,359,360,361,362,363,364,365,366,367,368,369,370,371,372,373,374,375,376,377,378,379,380,381,382,383,384,385,386,387,388,389,390,391,392,393,394,395,396,397,398,399,400];

const raw = fs.readFileSync(path, 'utf8');
const clean = raw.replace(/^[\uFEFF\u200B\u00A0]+/, '');
const data = JSON.parse(clean);
fs.copyFileSync(path, backupPath);
const before = data.length;
const filtered = data.filter((item) => !idsToRemove.includes(item.id));
const removedCount = before - filtered.length;
if (removedCount !== idsToRemove.length) {
  console.error(`Expected to remove ${idsToRemove.length} items, but removed ${removedCount}.`);
  const foundIds = data.filter((item) => idsToRemove.includes(item.id)).map((item) => item.id);
  console.error(`Found removable IDs: ${foundIds.join(', ')}`);
  process.exit(1);
}
fs.writeFileSync(path, JSON.stringify(filtered, null, 2));
const written = fs.readFileSync(path, 'utf8').replace(/^[\uFEFF\u200B\u00A0]+/, '');
JSON.parse(written);
console.log(`Backup created: ${backupPath}`);
console.log(`Removed ${removedCount} duplicate items.`);
