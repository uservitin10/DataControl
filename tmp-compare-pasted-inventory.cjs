const fs = require('fs');

const inventory = JSON.parse(fs.readFileSync('src/data/inventario.json', 'utf8'));
const pasted = fs.readFileSync('scripts/pasted.txt', 'utf8');

const emailRegex = /[a-z0-9._%+-]+@[a-z0-9.-]+\.gov\.br/gi;
const pastedEmails = Array.from(new Set(Array.from(pasted.matchAll(emailRegex)).map(m => m[0].toLowerCase())));

const inventoryEmails = new Set(
  inventory
    .map(item => (item.assetId || item.asset_id || '').toString().toLowerCase().trim())
    .filter(Boolean)
);

const missingEmails = pastedEmails.filter(email => !inventoryEmails.has(email));

console.log('pasted email count:', pastedEmails.length);
console.log('inventory email count:', inventoryEmails.size);
console.log('missing email count:', missingEmails.length);
console.log('missing emails:');
console.log(missingEmails.join('\n'));
fs.writeFileSync('tmp-missing-pasted-emails.json', JSON.stringify(missingEmails, null, 2) + '\n', 'utf8');
