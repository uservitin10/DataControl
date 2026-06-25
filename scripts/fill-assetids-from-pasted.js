const fs = require('fs');
const path = require('path');
const invPath = path.join(__dirname, '..', 'src', 'data', 'inventario.json');
const backupPath = invPath + '.bak.' + Date.now();

let PASTED = '';
const pastedFile = path.join(__dirname, 'pasted.txt');
if (fs.existsSync(pastedFile)) {
  PASTED = fs.readFileSync(pastedFile, 'utf8');
} else {
  console.warn('No pasted.txt found in scripts/. Please create it with Name+Email data.');
}

try {
  const invRaw = fs.readFileSync(invPath, 'utf8');
  fs.writeFileSync(backupPath, invRaw, 'utf8');
  const inventario = JSON.parse(invRaw);

    // build map from pasted text: find emails and take preceding text as the name
    const emailRegex = /[a-z0-9._%+-]+@planejamento\.gov\.br/gi;
    const map = new Map();
    const matches = [...PASTED.matchAll(emailRegex)];
    for (let i = 0; i < matches.length; i++) {
        const m = matches[i];
        const email = m[0].toLowerCase();
        const start = m.index;
        const prevEnd = i === 0 ? 0 : matches[i-1].index + matches[i-1][0].length;
        let nameChunk = PASTED.slice(prevEnd, start).trim();
        // clean name chunk: remove trailing separators and excessive whitespace
        nameChunk = nameChunk.replace(/[\r\n]+/g, ' ').replace(/[^\S\r\n]+/g, ' ').trim();
        // sometimes name and email are concatenated without separator; try to split camel by lowercase+Upper or digits
        if (!nameChunk || nameChunk.length < 2) {
            // fallback: try to extract up to last uppercase sequence before email
            const before = PASTED.slice(Math.max(0, start - 80), start);
            const m2 = before.match(/([A-ZÀ-Ö][^A-ZÀ-Ö]{1,80})$/);
            nameChunk = m2 ? m2[1].trim() : '';
        }
        if (nameChunk) {
            map.set(nameChunk.toLowerCase(), email);
        }
    }

  // Helper: fuzzy find email by responsible name tokens
  function findEmailForName(name) {
    if (!name) return null;
    const key = name.toLowerCase().replace(/\s+/g,' ').trim();
    if (map.has(key)) return map.get(key);
    const tokens = key.split(' ').filter(t=>t.length>2);
    for (const [k,v] of map.entries()) {
      let all = true;
      for (const t of tokens) {
        if (!k.includes(t)) { all = false; break; }
      }
      if (all) return v;
    }
    return null;
  }

  const licenses = inventario.filter(item => item.type === 'Licença' && item.equipmentState && String(item.equipmentState).toLowerCase() === 'ativa');
  let filled = 0;
  const details = [];

  licenses.forEach(item => {
    if (!item.assetId || !String(item.assetId).trim()) {
      const email = findEmailForName(item.responsible || item.model || '');
      if (email) {
        item.assetId = email;
        filled++;
        details.push({responsible: item.responsible, model: item.model, email});
      }
    }
  });

  if (filled > 0) {
    fs.writeFileSync(invPath, JSON.stringify(inventario, null, 2), 'utf8');
  }

  console.log('Backup created at', backupPath);
  console.log('Emails found in pasted content:', map.size);
  console.log('Filled assetId for', filled, 'items.');
  if (details.length>0) console.log('Samples:\n', details.slice(0,20));
} catch (err) {
  console.error('Erro:', err);
  process.exit(1);
}
