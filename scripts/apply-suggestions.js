const fs=require('fs'); const path=require('path');
const invPath = path.join(__dirname,'..','src','data','inventario.json');
const backupPath = invPath + '.bak.apply.' + Date.now();
fs.copyFileSync(invPath, backupPath);
const inventario = JSON.parse(fs.readFileSync(invPath,'utf8'));
const suggestions = JSON.parse(fs.readFileSync(path.join(__dirname,'suggestions.json'),'utf8'));
let applied = 0; const details = [];
const licenses = inventario.filter(item=>item.type==='Licença'&&item.equipmentState&&String(item.equipmentState).toLowerCase()==='ativa');
for(const s of suggestions){ if(s.best && s.bestScore>=2){ // find matching item(s)
    const candidates = licenses.filter(item=>{ const name=(item.responsible||item.model||'').toLowerCase().replace(/\s+/g,' ').trim(); return name.includes(s.model.toLowerCase()) || (s.responsible && name.includes((s.responsible||'').toLowerCase())); });
    // fallback: match by model equality
    if(candidates.length===0){ candidates.push(...licenses.filter(item=> (item.model||'').toLowerCase().includes((s.model||'').toLowerCase()))); }
    candidates.forEach(item=>{
      if(!item.assetId || !String(item.assetId).trim()){
        item.assetId = s.best[1]; applied++; details.push({responsible:item.responsible, model:item.model, email:s.best[1]});
      }
    });
 }}
fs.writeFileSync(invPath, JSON.stringify(inventario,null,2),'utf8');
console.log('Backup of inventario.json at',backupPath);
console.log('Applied count:', applied);
if(details.length>0) console.log('Samples:', details.slice(0,30));
