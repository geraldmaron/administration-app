const fs=require('node:fs'),{createRequire}=require('node:module');
const req=createRequire('<local path>'),{chromium}=req('@playwright/test');
(async()=>{
 const b=await chromium.launch(),c=await b.newContext(),p=await c.newPage(),records=[];
 await p.goto('http://127.0.0.1:5188/administrations');
 await p.getByLabel('Import a save exported from this game').setInputFiles('<local path>');
 await p.waitForURL('**/brief');
 for(const width of [320,390,768,845,1280,1440,1920])for(const theme of ['dark','light'])for(const view of ['offices','delivery','services','roster']){
  await p.setViewportSize({width,height:width<500?844:1000});await p.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
  await p.goto('http://127.0.0.1:5188/washington?view='+view);
  await p.locator('.executive-branches').waitFor();await p.waitForTimeout(150);
  const boxes=await p.locator('.executive-branches .ui-door-tile').evaluateAll(es=>es.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));
  if(boxes.length!==3||Math.max(...boxes.map(x=>x.w))-Math.min(...boxes.map(x=>x.w))>.6||Math.max(...boxes.map(x=>x.h))-Math.min(...boxes.map(x=>x.h))>.6)throw Error(JSON.stringify({width,theme,view,boxes}));
  if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('overflow '+width+theme+view);
  if([320,845,1440].includes(width)){
   await p.locator(view==='roster'?'.register__row':view==='services'?'.executive-service-table':view==='delivery'?'.executive-delivery-table':'.office-workspace__bar').first().scrollIntoViewIfNeeded();
   await p.screenshot({path:`/private/tmp/executive-captures/final-${view}-${width}-${theme}.png`});
   if(width===1440&&view==='roster'){await p.locator('.executive-branches').scrollIntoViewIfNeeded();await p.screenshot({path:`/private/tmp/executive-captures/final-branches-${theme}.png`});}
  }
  records.push({width,theme,view,boxes});fs.writeFileSync('/private/tmp/executive-layout-proof.json',JSON.stringify(records,null,2));
 }
 console.log('PASS: '+records.length+' layouts; equal peer panels and no document overflow');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
