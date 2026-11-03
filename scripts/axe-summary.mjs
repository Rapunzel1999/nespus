// Read the raw axe results produced by the full Playwright suite or its extracted artifact.
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

const root=process.argv[2]||'outputs/e2e';
const screens=['home','results','listing','comparison','conversation','editor','owner'];
const extra=['saved-search-failure/axe.json','saved-search-labels/axe.json','favorite-pages/axe-first.json','favorite-pages/axe.json','favorite-pages/axe-return.json','draft-storage-full/axe.json'];
const summary={evaluations:0,violations:0,byBrowser:{},findings:[]};

async function read(browser,file){
  const path=join(root,browser,file);
  const rows=JSON.parse(await readFile(path,'utf8'));
  if(!Array.isArray(rows))throw Error('Raport axe invalid: '+path);
  return rows;
}

function count(browser,page,violations){
  if(!Array.isArray(violations))throw Error('Lipsesc rezultatele axe: '+browser+'/'+page);
  summary.evaluations++;
  summary.byBrowser[browser]++;
  for(const item of violations){
    if(!item||typeof item.id!=='string'||![null,'minor','moderate','serious','critical'].includes(item.impact))throw Error('Rezultat axe invalid: '+browser+'/'+page);
    summary.violations++;
    summary.findings.push({browser,page,rule:item.id,impact:item.impact});
  }
}

for(const browser of ['chromium','webkit-mobile']){
  summary.byBrowser[browser]=0;
  for(const width of [375,768,1280]){
    const rows=await read(browser,width+'/axe.json');
    const pages=rows.map(row=>row.page);
    if(pages.length!==screens.length||screens.some(name=>!pages.includes(name))){
      throw Error('Raport incomplet sau pagini repetate: '+browser+'/'+width);
    }
    for(const row of rows)count(browser,width+'/'+row.page,row.violations);
  }
  for(const file of extra)count(browser,file,await read(browser,file));
}
console.log(JSON.stringify(summary,null,2));
if(summary.findings.some(item=>['serious','critical'].includes(item.impact)))process.exitCode=1;
