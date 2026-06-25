const fs = require('fs');
const path = require('node:path');

const inventoryPath = path.resolve(__dirname, '../src/data/inventario.json');

function fail(message) {
  console.error(message);
  process.exit(1);
}

try {
  let content = fs.readFileSync(inventoryPath, 'utf8');

  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
    fs.writeFileSync(inventoryPath, content, 'utf8');
    console.log('Removed UTF-8 BOM from src/data/inventario.json');
  }

  JSON.parse(content);
  process.exit(0);
} catch (error) {
  if (error && error.code === 'ENOENT') {
    fail(`File not found: ${inventoryPath}`);
  }
  fail(`Invalid JSON in src/data/inventario.json:\n${error.message}`);
}
