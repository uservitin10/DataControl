const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const currentPath = path.join(workspaceRoot, 'src/data/inventario.json');
const backupPath = path.join(workspaceRoot, 'src/data/inventario.json.old');

const current = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
const backup = JSON.parse(fs.readFileSync(backupPath, 'utf16le'));

const hasText = (value) => typeof value === 'string' && value.trim() !== '';
const currentById = new Map(current.map((item) => [item.id, item]));

let restoredLicenses = 0;
let restoredAllocations = 0;
let restoredResponsibles = 0;

for (const item of backup) {
  const currentItem = currentById.get(item.id);

  if (!currentItem) {
    current.push(item);
    currentById.set(item.id, item);
    const type = String(item.type || '').toLowerCase();
    if (type === 'licença' || type === 'licenca') {
      restoredLicenses += 1;
    }
    continue;
  }

  if (!hasText(currentItem.allocatedUser) && hasText(item.allocatedUser)) {
    currentItem.allocatedUser = item.allocatedUser;
    restoredAllocations += 1;
  }

  if (!hasText(currentItem.responsible) && hasText(item.responsible)) {
    currentItem.responsible = item.responsible;
    restoredResponsibles += 1;
  }
}

fs.writeFileSync(currentPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  restoredLicenses,
  restoredAllocations,
  restoredResponsibles,
  finalCount: current.length,
}, null, 2));
