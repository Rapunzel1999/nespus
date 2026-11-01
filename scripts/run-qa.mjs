import {spawnSync} from 'node:child_process';
const steps=[['pnpm','test'],['pnpm','run','typecheck'],['pnpm','build'],['pnpm','run','test:production-isolation'],['pnpm','exec','playwright','install','chromium','webkit'],['pnpm','run','test:e2e']];
for(const [command,...args] of steps){console.log('$ '+[command,...args].join(' '));const result=spawnSync(command,args,{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
