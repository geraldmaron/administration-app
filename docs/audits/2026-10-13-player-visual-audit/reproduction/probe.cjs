const {createRequire}=require('node:module');
const fs=require('node:fs');
const root='<local path>';
const req=createRequire(root+'/package.json');
const {chromium}=req('@playwright/test');
const out='/private/tmp/player-visual-audit';
const base='http://localhost:5187';
(async()=>{
const browser=await chromium.launch(); const context=await browser.newContext({viewport:{width:1440,height:900},colorScheme:'light'}); const p=await context.newPage(); p.setDefaultTimeout(15000); p.setDefaultNavigationTimeout(60000);console.log('browser ready');
await p.goto(base+'/administrations'); await p.getByLabel('Import a save exported from this game').setInputFiles(root+'/apps/web/tests/.fixtures/week-30.json'); await p.waitForURL('**/brief');console.log('imported');
const metrics=[];
for(const width of [1280,1440,1920]){await p.setViewportSize({width,height:width===1280?800:width===1440?900:1080});for(const path of ['/brief','/world/security','/nation/economy?view=markets&measure=crude']){console.log(width,path);await p.goto(base+path,{waitUntil:'domcontentloaded'});await p.locator('h1').waitFor({state:'attached'}); await p.waitForTimeout(400);metrics.push(await p.evaluate(()=>({width:innerWidth,url:location.pathname+location.search,body:[...document.querySelectorAll('.ui-surface__body')].map(e=>({width:e.clientWidth,padding:getComputedStyle(e).paddingInline})),kpis:[...document.querySelectorAll('.sec-kpi')].map(e=>({text:e.innerText,width:e.clientWidth,height:e.clientHeight,x:e.offsetLeft,y:e.offsetTop})),commodity:[...document.querySelectorAll('.eco-table th[scope=row]')].map(e=>({text:e.innerText,icons:e.querySelectorAll('svg[data-glyph]').length,width:e.clientWidth})),suppliers:[...document.querySelectorAll('.eco-supplier')].map(e=>({text:e.innerText,links:e.querySelectorAll('a').length})),colors:[...document.querySelectorAll('.ui-surface__body,.sec-panel,.eco-panel')].slice(0,4).map(e=>({class:e.className,bg:getComputedStyle(e).backgroundColor,shadow:getComputedStyle(e).boxShadow}))})));}}
fs.writeFileSync(out+'/measurements.json',JSON.stringify(metrics,null,2));
await p.setViewportSize({width:1440,height:900});await p.goto(base+'/world');await p.locator('h1').waitFor({state:'attached'});await p.waitForTimeout(400);
const nation=p.locator('a[href^="/world/nation/"]').first();const target=await nation.getAttribute('href');await nation.click();await p.waitForURL('**'+target); const landed=await p.locator('h1').innerText();await p.goBack();await p.locator('h1').waitFor({state:'attached'});fs.writeFileSync(out+'/back-journey.json',JSON.stringify({from:'/world',target,landed,returned:new URL(p.url()).pathname,heading:await p.locator('h1').innerText()},null,2));
await browser.close();console.log('probe complete');
})().catch(e=>{console.error(e);process.exit(1)});
