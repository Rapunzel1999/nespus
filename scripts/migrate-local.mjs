import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const journal=JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));
const config='dist/server/wrangler.json';
const run=args=>{const result=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js',...args],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);};
// Wrangler's migration registry makes this command repeatable; configure a copy
// whose migrations_dir resolves from the generated dist/server directory.
const wrangler=JSON.parse(await readFile(config,'utf8'));
for(const database of wrangler.d1_databases||[])database.migrations_dir='../../drizzle';
const {writeFile}=await import('node:fs/promises');
await writeFile('dist/server/wrangler.local-migrations.json',JSON.stringify(wrangler));
if(!journal.entries.length)throw Error('No migrations found.');
run(['d1','migrations','apply','DB','--local','--config','dist/server/wrangler.local-migrations.json','--persist-to','.wrangler/state']);
