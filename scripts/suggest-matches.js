const fs=require('fs'); const path=require('path');
const inv=require('../src/data/inventario.json');
const pasted=fs.readFileSync(path.join(__dirname,'pasted.txt'),'utf8');
const emailRegex=/[a-z0-9._%+-]+@planejamento\.gov\.br/gi;
const matches=[...pasted.matchAll(emailRegex)];
const map=new Map();
for(let i=0;i<matches.length;i++){
  const m=matches[i]; const email=m[0].toLowerCase(); const start=m.index; const prevEnd=i===0?0:matches[i-1].index+matches[i-1][0].length; let nameChunk=pasted.slice(prevEnd,start).trim().replace(/[\r\n]+/g,' ').replace(/[^\S\r\n]+/g,' ').trim(); if(!nameChunk||nameChunk.length<2){ const before=pasted.slice(Math.max(0,start-80),start); const m2=before.match(/([A-ZÀ-Ö][^A-ZÀ-Ö]{1,80})$/); nameChunk=m2?m2[1].trim():'';} if(nameChunk){map.set(nameChunk.toLowerCase(),email);} }
console.log('map size',map.size);
const licenses=inv.filter(item=>item.type==='Licença'&&item.equipmentState&&String(item.equipmentState).toLowerCase()==='ativa');
const missing=licenses.filter(l=>!l.assetId||!String(l.assetId).trim());
console.log('missing count',missing.length);
function score(a,b){const at=(a||'').split(/\s+/).filter(t=>t.length>2); const bt=(b||'').split(/\s+/).filter(t=>t.length>2); let s=0; for(const x of at) for(const y of bt) if(x===y) s++; return s;}
const results=[];
missing.forEach((item)=>{ let best=null; let bestScore=0; for(const [k,v] of map.entries()){ const s=score((item.responsible||item.model||'').toLowerCase(),k); if(s>bestScore){bestScore=s; best=[k,v];} } results.push({model:item.model,responsible:item.responsible,bestScore,best});});
results.forEach((r,i)=>{ console.log(`${i+1}. ${r.model} | ${r.responsible} | score=${r.bestScore} | email=${r.best?r.best[1]:'-'}`); if(r.bestScore>0) console.log('   matched key:',r.best[0]); });

// Print summary of matches with score>0
const matched=results.filter(r=>r.bestScore>0);
console.log('\nMatched count:', matched.length);

// Save suggestions to file
fs.writeFileSync(path.join(__dirname,'suggestions.json'), JSON.stringify(results, null, 2));
console.log('Suggestions written to scripts/suggestions.json');
