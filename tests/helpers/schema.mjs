import {readFileSync} from 'node:fs';
const journal=JSON.parse(readFileSync(new URL('../../drizzle/meta/_journal.json',import.meta.url),'utf8'));
export function applySchema(sql){for(const entry of journal.entries)sql.exec(readFileSync(new URL('../../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8'));}
