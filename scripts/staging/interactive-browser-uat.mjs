// Supported local Vite + Playwright system Chrome. Only predefined UAT actions.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { openHarness, sanitizeText } from './browser-uat-harness.mjs';
const root = process.cwd(), base = 'http://127.0.0.1:4175';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js','--config','tmp/ytrace-staging-vite/vite.config.ts','--host','127.0.0.1','--port','4175','--strictPort'], {cwd:root,stdio:['ignore','pipe','pipe'],windowsHide:true});
let ready=false;
server.stdout.on('data',d=>{if(String(d).includes('Local:'))ready=true;});
server.stderr.on('data',()=>{});
let browser, h;
const summary=async()=>({route:new URL(h.page.url()).pathname,text:sanitizeText((await h.page.locator('body').innerText()).slice(-6000)),errors:h.audit.errors,blocked:h.audit.blocked.slice(-10),httpFailures:h.audit.http.filter(x=>x.status>=400).slice(-12)});
try {
 for(let n=0;n<100&&!ready;n++)await new Promise(r=>setTimeout(r,100));
 if(!ready)throw Error('Local Vite did not start');
 browser=await chromium.launch({channel:'chrome',headless:true});
 h=await openHarness(root,browser,base);
 const run=process.argv.find(x=>x.startsWith('--run='))?.slice(6);
 if(run)h.audit.runLabel=run;
 await h.go('/signin');
 console.log(JSON.stringify({ready:true,...await summary()}));
 const rl=createInterface({input:process.stdin,terminal:false});
 for await(const line of rl){
  let command;
  try{
   command=JSON.parse(line);h.phase=command.phase??command.action;
   if(command.action==='orgLogin'){
    const actor=command.actor==='C'?h.orgC:command.actor==='renewal'?h.fixtures.renewalScenario:h.fixtures.actors[command.actor];
    if(!actor?.email||!actor.password)throw Error('Recorded actor unavailable');
    await h.go('/signin');await h.page.locator('#email').fill(actor.email);await h.page.locator('#password').fill(actor.password);await h.page.getByRole('button',{name:'Sign In',exact:true}).click();await h.page.waitForTimeout(5500);
   }else if(command.action==='adminLogin'){
    await h.go('/signin');await h.page.getByRole('button',{name:'Admin',exact:true}).click();
    const actor=command.actor==='zero'?h.fixtures.reviewer:{username:'staging-super-admin',password:h.env.YTRACE_STAGING_BOOTSTRAP_PASSWORD};
    if(!actor?.password)throw Error('Recorded Admin credential unavailable');
    await h.page.locator('#username').fill(actor.username);await h.page.locator('#password').fill(actor.password);await h.page.getByRole('button',{name:'Sign In',exact:true}).click();await h.page.waitForTimeout(5500);
   }else if(command.action==='go'){await h.go(command.route);await h.page.waitForTimeout(command.waitMs??1500);
   }else if(command.action==='click'){await h.page.getByRole(command.role??'button',{name:command.name,exact:command.exact??true}).nth(command.index??0).click({timeout:12000});await h.page.waitForTimeout(command.waitMs??2000);
   }else if(command.action==='viewport'){await h.page.setViewportSize({width:command.width,height:command.height});await h.page.waitForTimeout(1000);console.log(JSON.stringify({viewport:await h.page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}))}));
   }else if(command.action==='reload'){await h.page.reload({waitUntil:'domcontentloaded'});await h.page.waitForTimeout(2500);
   }else if(command.action==='controls'){console.log(sanitizeText(JSON.stringify(await h.page.locator('button,a,input').evaluateAll(es=>es.map(e=>({tag:e.tagName,role:e.getAttribute('role'),text:e.textContent?.trim().slice(0,100),label:e.getAttribute('aria-label'),title:e.getAttribute('title'),type:e.getAttribute('type')})).filter(e=>e.text||e.label||e.title)))));
   }else if(command.action==='mark'){h.mark(command.name,command.status,command.details??{});
   }else if(command.action==='download'){
    const event=h.page.waitForEvent('download',{timeout:20000});await h.page.getByRole('button',{name:command.name,exact:command.exact??true}).nth(command.index??0).click();const d=await event;const suggestedName=d.suggestedFilename();const stream=await d.createReadStream();const hash=(await import('node:crypto')).createHash('sha256');let size=0;for await(const bytes of stream){hash.update(bytes);size+=bytes.length;}const sha256=hash.digest('hex');const filenameMatchesExpected=command.expectedFilename? suggestedName===command.expectedFilename:null;const filenameHasSignedQueryTraits=/eyJ[A-Za-z0-9_-]{8,}\.|[?&](?:token|signature)=/i.test(suggestedName);h.mark(command.label??'Browser download bytes','PASS',{size,sha256,filenameMatchesExpected,filenameHasSignedQueryTraits});console.log(JSON.stringify({download:{size,sha256,filenameMatchesExpected,filenameHasSignedQueryTraits}}));
   }else if(command.action==='clickPopup'){
    const popupEvent=h.page.waitForEvent('popup',{timeout:20000});await h.page.getByRole(command.role??'button',{name:command.name,exact:command.exact??true}).nth(command.index??0).click();const popup=await popupEvent;h.popup=popup;
    let navigated=false;for(let i=0;i<100;i++){if(popup.url()!=='about:blank'){navigated=true;break;}await popup.waitForTimeout(100);}
    if(navigated)await popup.waitForTimeout(2200);
    const popupCheck=await popup.evaluate(stagingRef=>{const current=new URL(location.href);const embedded=current.searchParams.get('src');const target=embedded?new URL(embedded):current;const title=document.title;const signedValues=[...target.searchParams.values()].filter(Boolean);const nativePdfViewer=current.protocol==='chrome-extension:'&&current.hostname==='mhjfbmdgcfjbbpaeojofohoefgiehjai';return{navigated:location.href!=='about:blank',stagingStorageFile:target.hostname===`${stagingRef}.supabase.co`&&/^\/storage\/v1\/object\/(?:sign|authenticated)\//.test(target.pathname),pdfViewer:nativePdfViewer||Boolean(document.querySelector('pdf-viewer,embed[type="application/pdf"]')),titlePresent:Boolean(title),titleContainsSignedQueryValue:signedValues.some(value=>title.includes(value)),titleLooksLikeJwt:/eyJ[A-Za-z0-9_-]{8,}\./.test(title)}} , 'zroudsvpswqsjlyttkjf');
    const nestedPreviewCount=await h.page.locator('.pwa-document-preview').count();const passed=popupCheck.navigated&&popupCheck.stagingStorageFile&&!popupCheck.titleContainsSignedQueryValue&&!popupCheck.titleLooksLikeJwt&&nestedPreviewCount===0;h.mark('Renewal Open in New Tab opens the staging file without nested preview or token title',passed?'PASS':'FAIL',{...popupCheck,nestedPreviewCount});
    if(command.screenshot){if(!/^[a-z0-9-]{1,60}$/.test(command.screenshot))throw Error('Invalid popup screenshot label');await popup.screenshot({path:resolve(root,'docs/staging-validation/2026-10-11/final-browser-uat',command.screenshot+'.png')});}
    console.log(JSON.stringify({popup:{...popupCheck,nestedPreviewCount}}));
   }else if(command.action==='expireAdminLocal'){
    const token=await h.page.evaluate(()=>{const key='lydo_admin_session_v1',s=JSON.parse(localStorage.getItem(key)||'null');if(!s)throw Error('No current Admin session');s.expiresAt=new Date(Date.now()-1000).toISOString();localStorage.setItem(key,JSON.stringify(s));return s.sessionToken;});await h.page.reload({waitUntil:'domcontentloaded'});await h.page.waitForTimeout(2500);
    const cleanup=await h.page.evaluate(async token=>{const {supabase}=await import('/src/lib/supabase.ts');const {error}=await supabase.rpc('revoke_admin_session_token',{_session_token:token});return {revoked:!error};},token);
    h.mark('Simulated local Admin expiry redirects and test session is revoked',new URL(h.page.url()).pathname==='/signin'&&cleanup.revoked?'PASS':'FAIL',{route:new URL(h.page.url()).pathname,...cleanup});
   }else if(command.action==='refreshOrgSession'){
    const result=await h.page.evaluate(async()=>{const {supabase}=await import('/src/lib/supabase.ts');const {data,error}=await supabase.auth.refreshSession();return {success:!error,identityPresent:!!data.user?.id};});h.mark('Genuine organization token refresh',result.success?'PASS':'FAIL',result);
   }else if(command.action==='revokeCurrentAdmin'){
    const result=await h.page.evaluate(async()=>{const {supabase}=await import('/src/lib/supabase.ts');const s=JSON.parse(localStorage.getItem('lydo_admin_session_v1')||'null');if(!s)return {revoked:false};const {error}=await supabase.rpc('revoke_admin_session_token',{_session_token:s.sessionToken});const {data,error:validationError}=await supabase.rpc('validate_admin_session_token',{_session_token:s.sessionToken});return {revoked:!error,denied:!validationError&&Array.isArray(data)&&data.length===0};});h.mark('Genuine Admin session revocation and rejection',result.revoked&&result.denied?'PASS':'FAIL',result);await h.page.reload({waitUntil:'domcontentloaded'});await h.page.waitForTimeout(2500);
   }else if(command.action==='assert'){
    const text=await h.page.locator('body').innerText();const passed=(!command.route||new URL(h.page.url()).pathname===command.route)&&(!command.includes||text.includes(command.includes))&&(!command.excludes||!text.includes(command.excludes));h.mark(command.name,passed?'PASS':'FAIL',{route:new URL(h.page.url()).pathname});
   }else if(command.action==='offline'){
    await h.context.setOffline(command.enabled);await h.page.waitForTimeout(1200);
   }else if(command.action==='state'){
    console.log(JSON.stringify(await h.page.evaluate(()=>({authPresent:!!localStorage.getItem('sb-zroudsvpswqsjlyttkjf-auth-token'),adminPresent:!!localStorage.getItem('lydo_admin_session_v1')}))));
   }else if(command.action==='snapshot'){await h.page.screenshot({path:resolve(root,'docs/staging-validation/2026-10-11/final-browser-uat',command.name+'.png'),fullPage:true});
   }else if(command.action==='finish'){h.audit.finishedAt=new Date().toISOString();await h.save();console.log(JSON.stringify({saved:true,checks:h.audit.checks,networkRequests:h.audit.http.length}));break;
   }else if(command.action!=='inspect')throw Error('Unsupported UAT action');
   if(command.action!=='controls')console.log(JSON.stringify(await summary()));
  }catch(e){const failure={action:command?.action,operationError:e.name,reason:sanitizeText(e.message).slice(0,160)};h.audit.operationErrors??=[];h.audit.operationErrors.push(failure);console.log(JSON.stringify(failure));}
 }
}catch(e){console.log(JSON.stringify({fatal:e.name,reason:String(e.message).replace(/https?:\/\/\S+/g,'[URL]').slice(0,160)}));process.exitCode=1;
}finally{if(browser)await browser.close();server.kill();process.stdin.pause();}
