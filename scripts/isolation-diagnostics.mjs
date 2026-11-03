import {get} from 'node:http';

// Diagnostic only: never substitutes for the failed isolation assertion.
export async function diagnoseLocalRuntime(origin,timeoutMs=3000){
  const url=new URL(origin);
  if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Local loopback origin required');
  return Promise.all(['/api/health','/api/bootstrap'].map(path=>new Promise(resolve=>{
    const started=performance.now();let finished=false,bytes=0,body='';
    const done=fields=>{if(finished)return;finished=true;resolve({path,elapsedMs:Math.round(performance.now()-started),...fields});};
    const req=get(new URL(path,url),{signal:AbortSignal.timeout(timeoutMs),headers:{cookie:'DEMO-test-role=moderator',connection:'close'}},res=>{
      res.setEncoding('utf8');
      res.on('data',chunk=>{bytes+=Buffer.byteLength(chunk);if(bytes>65536){done({status:res.statusCode,error:'BODY_TOO_LARGE'});req.destroy();return;}body+=chunk;});
      res.on('end',()=>{let data;try{data=JSON.parse(body);}catch{done({status:res.statusCode,json:false});return;}
        done({status:res.statusCode,json:true,...(path==='/api/bootstrap'?{anonymous:data?.user===null,phoneVerification:typeof data?.capabilities?.phoneVerification==='boolean'?data.capabilities.phoneVerification:null}:{} )});
      });
      res.on('error',()=>done({error:'RESPONSE_ERROR'}));
    });
    req.on('error',error=>done({error:error.code==='ABORT_ERR'?'TIMEOUT':'CONNECTION_ERROR'}));
  })));
}
