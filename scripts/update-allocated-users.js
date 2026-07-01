import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
const file = join(process.cwd(), 'src', 'data', 'inventario.json');
const backup = join(process.cwd(), 'src', 'data', 'inventario.json.bak');
const data = JSON.parse(readFileSync(file, 'utf8'));
const ignore = new Set(['', 'Sem usuário alocado', 'sem usuário alocado', 'Livre', 'Depósito', 'Caixa - Depósito', 'Problema', 'Power BI - remoto', 'Minidepósito IPEA']);
let updated = 0;
for (const e of data) {
  if (e.assetType !== 'SW' && (!e.allocatedUser || !e.allocatedUser.trim())) {
    const r = (e.responsible || '').trim();
    if (r && !ignore.has(r)) {
      e.allocatedUser = r;
      updated++;
    }
  }
}
copyFileSync(file, backup);
writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('updated', updated);
