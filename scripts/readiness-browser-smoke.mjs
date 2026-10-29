// Local Edge browser fixtures only. Every non-local request is intercepted.
// These checks do not validate real credentials, database authorization or records.
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('tmp/readiness-build');
const server = createServer(async (req,res) => {
  try {
    let path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
    if(!path.startsWith(root+sep)&&path!==root) return res.writeHead(403).end();
    if(!(await stat(path).catch(()=>null))?.isFile()) path=resolve(root,'index.html');
    res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.webp':'image/webp'})[extname(path)]??'application/octet-stream'}).end(await readFile(path));
  } catch {res.writeHead(500).end();}
});
await new Promise(r=>server.listen(4295,'127.0.0.1',r));
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[];
try {
  for(const mode of ['anonymous','admin-fixture','admin-chunk-failure','slow-admin-fixture','admin-version-fixture']) {
    const context=await browser.newContext({serviceWorkers:'block'});
    const page=await context.newPage(); const errors=[]; const requests=[]; let budgetVersion=1,registrationVersion=1,consoleErrors=0;
    page.on('pageerror',e=>errors.push(e.message));
    // Count, rather than persist, console payloads which may contain credentials.
    page.on('console',message=>{if(message.type()==='error') consoleErrors++;});
    const permissions=[...new Set([...((await readFile('src/lib/admin-permissions.ts','utf8')).matchAll(/code: "([a-z_]+)"/g))].map(m=>m[1]))];
    if(mode!=='anonymous') await context.addInitScript(({permissions})=>{
      localStorage.setItem('lydo_admin_session_v1',JSON.stringify({id:'fixture-admin',username:'fixture',email:'fixture@example.invalid',displayName:'Fixture Admin',sessionToken:'fixture-only-token',expiresAt:new Date(Date.now()+3600000).toISOString(),lastActivityAt:Date.now(),roleCode:'super_admin',permissionCodes:permissions,isEmailVerified:true}));
      localStorage.setItem('lydo_admin_last_activity_v1',String(Date.now()));
    },{permissions});
    await context.route('**/*',async route=>{
      const u=new URL(route.request().url());
      if(u.hostname==='127.0.0.1') {
        if(mode==='admin-chunk-failure'&&/\/assets\/AdminPortal-.*\.js$/.test(u.pathname)) return route.abort('failed');
        return route.continue();
      }
      // Do not copy request bodies or credential headers into evidence.
      requests.push({path:u.pathname,method:route.request().method(),at:Date.now()});
      const rpc=u.pathname.split('/').pop(); let data=[];
      if(rpc==='validate_admin_session_token') data=[{admin_id:'fixture-admin',expires_at:new Date(Date.now()+3600000).toISOString()}];
      else if(rpc==='get_admin_permission_context') data=[{role_code:'super_admin',role_label:'Super Admin',permission_codes:permissions}];
      else if(rpc==='admin_get_portal_change_versions') data={registration:registrationVersion,renewals:1,budgets:budgetVersion,liquidations:1,ypop_city_led:1,ypop_org_led:1};
      else if(/page$/.test(rpc)) data={rows:[],totalCount:0,page:1,pageSize:20,summary:{}};
      else if(rpc==='admin_get_dashboard_summary'||rpc==='admin_get_portal_section_state') data={};
      await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','content-range':'0-0/0'},body:JSON.stringify(data)});
    });
    if(mode==='slow-admin-fixture') {
      const cdp=await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:200,downloadThroughput:200000,uploadThroughput:100000});
    }
    const routes=mode==='admin-fixture' ? ['/admin','/admin/registrations','/admin/renewals','/admin/budget-utilization','/admin/liquidation-monitoring','/admin/ypop-validation','/admin/yorp-registry','/admin/budget-monitoring','/admin/activity-logs','/admin/notifications','/admin/templates','/admin/settings','/admin/backup-recovery'] : [mode==='admin-version-fixture'?'/admin/budget-utilization':'/admin'];
    for(const path of routes) {
      const count=requests.length, errorCount=errors.length,consoleBefore=consoleErrors;
      await page.goto('http://127.0.0.1:4295'+path,{waitUntil:'networkidle',timeout:120000});
      await page.waitForTimeout(500);
      const text=await page.locator('body').innerText();
      results.push({mode,path,finalPath:new URL(page.url()).pathname,title:await page.title(),headings:await page.getByRole('heading').allTextContents(),errors:errors.slice(errorCount),consoleErrorCount:consoleErrors-consoleBefore,requests:requests.slice(count).map(({at,...r})=>r),chunkRecovery:text.includes('Unable to load this page'),reloadButton:await page.getByRole('button',{name:'Reload page',exact:true}).count()});
    }
    if(mode==='admin-version-fixture') {
      const phases=[];
      const record=async(name,wait)=>{const before=requests.length;await page.waitForTimeout(wait);phases.push({name,requests:requests.slice(before).map(({at,...r})=>r)});};
      await record('unchanged version',9000);
      budgetVersion++; await record('relevant budget version changed',8500);
      registrationVersion++; await record('unrelated registration version changed',8500);
      await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
      await record('hidden tab',9000);
      budgetVersion++;
      await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'});document.dispatchEvent(new Event('visibilitychange'));});
      await record('visible again after change',1500);
      results.push({mode,phases,errors});
    }
    await context.close();
  }
  await writeFile('docs/readiness/2026-10-09/browser-fixtures.json',JSON.stringify({scope:'Local production build with mocked empty Admin data and fixture session. Non-local traffic intercepted. Slow case simulated 200 ms latency / 200 KB/s download. Not authenticated E2E or physical PWA testing.',results},null,2));
} finally {await browser.close();await new Promise(r=>server.close(r));}
