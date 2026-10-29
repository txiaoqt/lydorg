// Isolated anonymous Edge profiles, local production assets, read-only public API traffic.
// node scripts/performance-browser-audit.mjs tmp/performance-baseline tmp/performance-after
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const output = [];
const browser = await chromium.launch({channel:'msedge',headless:true});
try {
  for (const [i,dir] of process.argv.slice(2).entries()) {
    const root = resolve(dir);
    const server = createServer(async (req,res) => {
      try {
        let path = resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname));
        if (!path.startsWith(root+sep) && path !== root) {res.writeHead(403).end();return;}
        if (!(await stat(path).catch(()=>null))?.isFile()) path=resolve(root,'index.html');
        const data=await readFile(path);
        res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.ttf':'font/ttf'})[extname(path)]??'application/octet-stream','Cache-Control':'no-store'}).end(data);
      } catch {res.writeHead(500).end();}
    });
    await new Promise(r=>server.listen(4280+i,'127.0.0.1',r));
    try {
      for (const route of ['/', '/public-templates']) {
        const context = await browser.newContext({serviceWorkers:'block'});
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        const wire = new Map();
        cdp.on('Network.responseReceived',e=>{
          const u=new URL(e.response.url);
          wire.set(e.requestId,{host:u.hostname,path:u.pathname,status:e.response.status,type:e.type,
            responseMs:e.response.timing ? e.response.timing.receiveHeadersEnd : null,encodedBytes:0});
        });
        cdp.on('Network.loadingFinished',e=>{
          const r=wire.get(e.requestId);if(r) r.encodedBytes=e.encodedDataLength;
        });
        await page.addInitScript(()=>{
          window.__longTasks=[];
          new PerformanceObserver(list=>window.__longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});
        });
        const requests=[],failures=[];
        page.on('request',r=>{const u=new URL(r.url());requests.push({host:u.hostname,path:u.pathname,method:r.method(),at:Date.now()});});
        page.on('requestfailed',r=>failures.push({path:new URL(r.url()).pathname,error:r.failure()?.errorText}));
        await page.goto(`http://127.0.0.1:${4280+i}${route}`,{waitUntil:'networkidle',timeout:60000});
        await page.waitForTimeout(3000);
        const idleStart=Date.now();
        if(route==='/public-templates') await page.waitForTimeout(35000);
        const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(e=>({name:new URL(e.name).pathname,host:new URL(e.name).hostname,initiator:e.initiatorType,duration:e.duration,transferSize:e.transferSize,decodedBodySize:e.decodedBodySize})));
        output.push({build:dir,route,scope:'Anonymous local Edge; uncompressed local assets; real public API where reachable; not production page latency',idleSeconds:route==='/public-templates'?35:0,
          pageTitle:await page.title(),initialRequests:requests.filter(r=>r.at<idleStart).length,idleRequests:requests.filter(r=>r.at>=idleStart).length,
          apiRequests:requests.filter(r=>r.host.endsWith('supabase.co')).map(({at,...r})=>({...r,phase:at<idleStart?'load':'idle'})),
          resources,wireResponses:[...wire.values()],failures,longTasks:await page.evaluate(()=>window.__longTasks)});
        console.log(`${dir} ${route} recorded`);
        await context.close();
      }
    } finally {await new Promise(r=>server.close(r));}
  }
  await writeFile(process.env.PERFORMANCE_BROWSER_OUTPUT || 'docs/performance/2026-10-09/browser-public.json',JSON.stringify(output,null,2));
} finally {await browser.close();}
