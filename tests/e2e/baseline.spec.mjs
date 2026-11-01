import {test,expect,chromium} from '@playwright/test';
import lighthouse from 'lighthouse';
import {mkdir,writeFile} from 'node:fs/promises';
test('mobile Lighthouse and cold homepage network measurements',async({request,browser},info)=>{
  test.skip(info.project.name!=='chromium','Lighthouse requires Chromium');
  test.setTimeout(180000);
  expect((await request.post('/__test/reset',{headers:{origin:'http://127.0.0.1:4180'}})).status()).toBe(200);
  await mkdir('outputs/e2e/baseline',{recursive:true});
  const context=await browser.newContext({baseURL:'http://127.0.0.1:4180',viewport:{width:375,height:812}}),page=await context.newPage();
  const responses=[];page.on('response',r=>responses.push({url:r.url(),status:r.status()}));
  await page.goto('/atelier');await page.waitForLoadState('networkidle');await expect(page.locator('.property-card').first()).toBeVisible();
  const entries=await page.evaluate(()=>[...performance.getEntriesByType('navigation'),...performance.getEntriesByType('resource')].map(e=>({name:e.name,transferSize:e.transferSize,encodedBodySize:e.encodedBodySize,decodedBodySize:e.decodedBodySize})));
  const network={viewport:'375×812',context:'cold local DEMO D1; no hosted gateway; before scrolling',responses:responses.length,transferBytes:entries.reduce((n,e)=>n+e.transferSize,0),encodedBytes:entries.reduce((n,e)=>n+e.encodedBodySize,0),entries};
  await context.close();
  const chrome=await chromium.launch({args:['--remote-debugging-port=9223']});
  const measurements=[];
  try{for(const [name,path] of [['home','/atelier'],['results','/atelier?view=browse&transaction=sale&currency=EUR'],['listing','/atelier?listing=00000000000000000000000000000001']]){
    const result=await lighthouse('http://127.0.0.1:4180'+path,{port:9223,output:'html',logLevel:'error',onlyCategories:['performance','accessibility'],formFactor:'mobile',screenEmulation:{mobile:true,width:375,height:812,deviceScaleFactor:1,disabled:false}});
    if(result.lhr.runtimeError)throw Error(JSON.stringify(result.lhr.runtimeError));
    await writeFile('outputs/e2e/baseline/'+name+'.html',result.report);
    measurements.push({page:name,performance:result.lhr.categories.performance.score*100,accessibility:result.lhr.categories.accessibility.score*100,LCP:result.lhr.audits['largest-contentful-paint'].numericValue,CLS:result.lhr.audits['cumulative-layout-shift'].numericValue,TBT:result.lhr.audits['total-blocking-time'].numericValue,fetchTime:result.lhr.fetchTime,lighthouseVersion:result.lhr.lighthouseVersion});
  }}finally{await chrome.close();}
  const report={network,lighthouse:measurements};await writeFile('outputs/e2e/baseline/measurements.json',JSON.stringify(report,null,2));console.log('MEASURED_BASELINE '+JSON.stringify(report));
});
