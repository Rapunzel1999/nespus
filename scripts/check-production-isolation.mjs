import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
let files=0;
async function scan(path){for(const entry of await readdir(path,{withFileTypes:true})){const p=join(path,entry.name);if(entry.isDirectory())await scan(p);else if(/\.(?:js|mjs|html)$/.test(p)){files++;const source=await readFile(p,'utf8');if(/DEMO-test-role|local-d1-only|DEMO-fixture-only-not-a-credential|__test\/reset/.test(source))throw Error('Test auth/phone/seed leaked into production: '+p);}}}
await scan('dist');if(!files)throw Error('Production build missing');console.log('Production isolation: '+files+' built files scanned; test auth, fake phone and seed absent.');
