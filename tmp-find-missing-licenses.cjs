const fs = require('fs');

const inventory = JSON.parse(fs.readFileSync('src/data/inventario.json', 'utf8'));
const suggestions = JSON.parse(fs.readFileSync('scripts/suggestions.json', 'utf8'));

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

const existingKeys = new Set(
  inventory
    .filter((item) => item.type === 'Licença')
    .map((item) => `${normalize(item.model)}|${normalize(item.assetId || item.asset_id)}`)
    .filter((key) => key && key !== '|')
);

const suggestionItems = suggestions
  .map((entry, index) => {
    const email = Array.isArray(entry.best) ? normalize(entry.best[1]) : '';
    const model = String(entry.model || '').trim();
    const responsible = String(entry.responsible || '').trim();
    const key = `${normalize(model)}|${email}`;
    return { index, model, responsible, email, key, bestScore: entry.bestScore };
  })
  .filter((item) => item.model && item.email);

const missing = [];
const seen = new Set();

for (const item of suggestionItems) {
  if (existingKeys.has(item.key)) continue;
  const duplicateKey = item.key;
  if (seen.has(duplicateKey)) continue;
  seen.add(duplicateKey);
  missing.push(item);
}

console.log('inventory license count:', inventory.filter((item) => item.type === 'Licença').length);
console.log('suggestion items count:', suggestionItems.length);
console.log('missing license suggestions count:', missing.length);
console.log('missing sample:');
console.log(missing.slice(0, 50).map((item) => ({ model: item.model, responsible: item.responsible, email: item.email, bestScore: item.bestScore })));

fs.writeFileSync('tmp-missing-licenses.json', JSON.stringify(missing, null, 2) + '\n', 'utf8');
console.log('Wrote tmp-missing-licenses.json');
