// Custom Admin gateway RPC: per-reviewer-role signing matrix, lifecycle states,
// ownership/ambiguity rejection. Isolated PGlite running the actual foundation SQL
// and the captured live token validator, with synthetic rows and a noncryptographic
// digest fixture. NOT a deployed Edge Function or Storage API test.
import { PGlite } from '../../tmp/organization-identity-db/node_modules/@electric-sql/pglite/dist/index.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uid, foundation, installBaseline } from './storage_fixture_schema.mjs';

// Permission codes as captured from the live role registry (no renewals_manage, no MOVE code exists).
const ROLES = {
  'Super Admin': ['super_admin', []],
  'Registration reviewer': ['registration_reviewer', ['registrations_management']],
  'Renewal reviewer (registrations_management)': ['renewal_reviewer', ['registrations_management']],
  'YORP registry viewer': ['registry_viewer', ['yorp_registry_view']],
  'Budget reviewer': ['budget_reviewer', ['budget_requests_review']],
  'Liquidation reviewer': ['liquidation_reviewer', ['liquidation_reports_review']],
  'YPOP reviewer': ['ypop_reviewer', ['ypop_validation_review']],
  'Unauthorized Admin': ['limited', ['inquiries_management','activity_logs_view']],
};

test('custom Admin signing requires current permission, reviewable metadata and exact owned object', async () => {
  const db = new PGlite(); const matrix = [];
  try {
    await installBaseline(db);
    await db.exec('begin'); await db.exec(foundation); await db.exec('commit');
    const orgA = uid(11), userA = uid(1), orgB = uid(12), userB = uid(2), type = uid(90), renewal = uid(95);
    await db.query("insert into organization_profiles(id,user_id,profile_status) values($1,$2,'verified'),($3,$4,'pending_review')",[orgA,userA,orgB,userB]);
    await db.query("insert into required_document_types values($1,null,true,'Requirement')",[type]);
    await db.query("insert into organization_renewals values($1,$2,'under_review')",[renewal,orgA]);
    const obj = async (bucket,name,owner) => db.query('insert into storage.objects(bucket_id,name,owner_id) values($1,$2,$3)',[bucket,name,owner]);
    const files = {};
    // Registration (approved) and renewal (under review) for org A; a draft registration doc for org B.
    await db.query("insert into document_submissions(id,organization_id,submission_scope,status) values($1,$2,'registration','approved_green'),($3,$2,'renewal','under_review'),($4,$5,'registration','draft')",[uid(31),orgA,uid(32),uid(33),orgB]);
    await db.query("update document_submissions set renewal_id=$1 where id=$2",[renewal,uid(32)]);
    files.registration = `${orgA}/${type}/approved.pdf`;
    files.renewal = `${orgA}/renewal/${renewal}/${type}/renewal.pdf`;
    files.draftRegistration = `${orgB}/${type}/draft.pdf`;
    await db.query("insert into document_submission_files(id,submission_id,document_type_id,file_url,admin_status) values($1,$2,$3,$4,'approved_green'),($5,$6,$3,$7,'under_admin_review'),($8,$9,$3,$10,'draft')",
      [uid(41),uid(31),type,`storage://organization-documents/${files.registration}`,uid(42),uid(32),`storage://organization-documents/${files.renewal}`,uid(43),uid(33),`storage://organization-documents/${files.draftRegistration}`]);
    for (const k of ['registration','renewal']) await obj('organization-documents',files[k],userA);
    await obj('organization-documents',files.draftRegistration,userB);
    // Budget (submitted), liquidation (submitted, same-org budget), YPOP entry/city/activity (submitted), MOVE (submitted).
    const budget=uid(51), liq=uid(52), entry=uid(53), part=uid(54), act=uid(55), move=uid(56);
    await db.query("insert into budget_requests(id,organization_id,status) values($1,$2,'under_review')",[budget,orgA]);
    await db.query("insert into liquidation_reports values($1,$2,$3,'submitted')",[liq,orgA,budget]);
    await db.query("insert into ypop_entries values($1,$2,'submitted','2026-S2')",[entry,orgA]);
    await db.query("insert into ypop_event_participations values($1,$2,'verified')",[part,orgA]);
    await db.query("insert into ypop_org_activities values($1,$2,$3,'submitted')",[act,orgA,entry]);
    await db.query("insert into move_applications values($1,$2,'submitted')",[move,orgA]);
    const simple = [['budget','budget-request-files','budget_request_files',budget],['liquidation','liquidation-report-files','liquidation_report_files',liq],
      ['ypopEntry','ypop-files','ypop_files',entry],['ypopCity','ypop-files','ypop_event_files',part],['ypopActivity','ypop-files','ypop_org_activity_files',act],['move','move-files','move_files',move]];
    for (const [k,bucket,table,parent] of simple) {
      files[k]=`${parent}/${k}.pdf`; await obj(bucket,files[k],userA);
      const cols = { budget_request_files:'(id,budget_request_id,file_url)', liquidation_report_files:'(id,liquidation_report_id,file_url)' }[table];
      if (cols) await db.query(`insert into ${table}${cols} values($1,$2,$3)`,[uid(60+simple.findIndex(s=>s[0]===k)),parent,`storage://${bucket}/${files[k]}`]);
      else await db.query(`insert into ${table} values($1,$2,$3,$4)`,[uid(60+simple.findIndex(s=>s[0]===k)),parent,orgA,`storage://${bucket}/${files[k]}`]);
    }
    const bucketOf = { registration:'organization-documents', renewal:'organization-documents', draftRegistration:'organization-documents', budget:'budget-request-files', liquidation:'liquidation-report-files', ypopEntry:'ypop-files', ypopCity:'ypop-files', ypopActivity:'ypop-files', move:'move-files' };
    // Sessions: one per role plus expired/revoked/inactive Super Admin.
    let n = 200;
    const tokens = {};
    const addAdmin = async (label, code, perms, { active=true, expires='2099-01-01', revoked=null }={}) => {
      n++; await db.query('insert into roles values($1,$2,$2,$3)',[uid(n+1000),code,perms]);
      await db.query('insert into admin_accounts values($1,$2::text::citext,$2::text::citext,$2::text,$3,$4)',[uid(n),`admin-${n}`,active,uid(n+1000)]);
      await db.query("insert into admin_sessions values($1,encode(extensions.digest($2,'sha256'),'hex'),$3,$4,null)",[uid(n),`tok-${n}`,revoked,expires]);
      tokens[label]=`tok-${n}`; return uid(n);
    };
    for (const [label,[code,perms]] of Object.entries(ROLES)) await addAdmin(label,code,perms);
    await addAdmin('Expired session','super_admin',[],{expires:'2000-01-01'});
    await addAdmin('Revoked session','super_admin',[],{revoked:'2026-01-01'});
    const deactivated = await addAdmin('Inactive account','super_admin',[],{active:false});
    const demoted = await addAdmin('Permission removed after login','budget_reviewer',['budget_requests_review']);

    const sign = async (token,bucket,path) => { await db.exec('set role service_role'); try { const r=(await db.query("select public.admin_authorize_storage_operation($1,'sign',$2,$3,null) as g",[token,bucket,path])).rows[0].g; return r.object_name===path && r.bucket_id===bucket; } catch { return false; } finally { await db.exec('reset role'); } };
    const expected = {
      'Super Admin':                                  { registration:1, renewal:1, draftRegistration:0, budget:1, liquidation:1, ypopEntry:1, ypopCity:1, ypopActivity:1, move:1 },
      'Registration reviewer':                        { registration:1, renewal:1, draftRegistration:0, budget:0, liquidation:0, ypopEntry:0, ypopCity:0, ypopActivity:0, move:0 },
      'Renewal reviewer (registrations_management)':  { registration:1, renewal:1, draftRegistration:0, budget:0, liquidation:0, ypopEntry:0, ypopCity:0, ypopActivity:0, move:0 },
      'YORP registry viewer':                         { registration:1, renewal:0, draftRegistration:0, budget:0, liquidation:0, ypopEntry:0, ypopCity:0, ypopActivity:0, move:0 },
      'Budget reviewer':                              { registration:0, renewal:0, draftRegistration:0, budget:1, liquidation:0, ypopEntry:0, ypopCity:0, ypopActivity:0, move:0 },
      'Liquidation reviewer':                         { registration:0, renewal:0, draftRegistration:0, budget:0, liquidation:1, ypopEntry:0, ypopCity:0, ypopActivity:0, move:0 },
      'YPOP reviewer':                                { registration:0, renewal:0, draftRegistration:0, budget:0, liquidation:0, ypopEntry:1, ypopCity:1, ypopActivity:1, move:0 },
      'Unauthorized Admin':                           { registration:0, renewal:0, draftRegistration:0, budget:0, liquidation:0, ypopEntry:0, ypopCity:0, ypopActivity:0, move:0 },
      'Expired session':                              { registration:0, renewal:0, draftRegistration:0, budget:0, liquidation:0, ypopEntry:0, ypopCity:0, ypopActivity:0, move:0 },
      'Revoked session':                              { registration:0, renewal:0, draftRegistration:0, budget:0, liquidation:0, ypopEntry:0, ypopCity:0, ypopActivity:0, move:0 },
      'Inactive account':                             { registration:0, renewal:0, draftRegistration:0, budget:0, liquidation:0, ypopEntry:0, ypopCity:0, ypopActivity:0, move:0 },
    };
    for (const [label,row] of Object.entries(expected)) {
      const actual = {};
      for (const k of Object.keys(row)) { actual[k] = (await sign(tokens[label],bucketOf[k],files[k])) ? 1 : 0; }
      assert.deepEqual(actual,row,label); matrix.push({ admin:label, ...actual });
    }
    // Current permission is re-read on every call: removing it denies an existing session.
    assert.equal(await sign(tokens['Permission removed after login'],'budget-request-files',files.budget),true);
    await db.query("update roles set permission_codes='{}' where id=(select role_id from admin_accounts where id=$1)",[demoted]);
    assert.equal(await sign(tokens['Permission removed after login'],'budget-request-files',files.budget),false,'permission revocation');
    // Deactivation after login denies immediately.
    await db.query('update admin_accounts set is_active=true where id=$1',[deactivated]);
    assert.equal(await sign(tokens['Inactive account'],'budget-request-files',files.budget),true);
    await db.query('update admin_accounts set is_active=false where id=$1',[deactivated]);
    assert.equal(await sign(tokens['Inactive account'],'budget-request-files',files.budget),false,'account deactivation');

    const SA = tokens['Super Admin'];
    const negatives = {};
    // Unreferenced object in a real parent's folder.
    await obj('budget-request-files',`${budget}/unreferenced.pdf`,userA);
    negatives.unreferencedObject = await sign(SA,'budget-request-files',`${budget}/unreferenced.pdf`);
    // Referenced metadata but object owned by a different principal (owner mismatch).
    await db.query("insert into budget_request_files(id,budget_request_id,file_url) values($1,$2,$3)",[uid(80),budget,`storage://budget-request-files/${budget}/foreign-owner.pdf`]);
    await obj('budget-request-files',`${budget}/foreign-owner.pdf`,userB);
    negatives.ownerMismatch = await sign(SA,'budget-request-files',`${budget}/foreign-owner.pdf`);
    // Metadata row exists but object missing.
    await db.query("insert into budget_request_files(id,budget_request_id,file_url) values($1,$2,$3)",[uid(81),budget,`storage://budget-request-files/${budget}/missing.pdf`]);
    negatives.missingObject = await sign(SA,'budget-request-files',`${budget}/missing.pdf`);
    // Ambiguous: one object referenced by two organizations' parents.
    const budgetB=uid(57);
    await db.query("insert into budget_requests(id,organization_id,status) values($1,$2,'under_review')",[budgetB,orgB]);
    await db.query("insert into budget_request_files(id,budget_request_id,file_url) values($1,$2,$3)",[uid(82),budgetB,`storage://budget-request-files/${files.budget}`]);
    negatives.ambiguousCrossOrg = await sign(SA,'budget-request-files',files.budget);
    await db.query('delete from budget_request_files where id=$1',[uid(82)]);
    // Liquidation whose budget belongs to another org.
    const liqX=uid(58);
    await db.query("insert into liquidation_reports values($1,$2,$3,'submitted')",[liqX,orgA,budgetB]);
    await db.query("insert into liquidation_report_files values($1,$2,$3)",[uid(83),liqX,`storage://liquidation-report-files/${liqX}/x.pdf`]);
    await obj('liquidation-report-files',`${liqX}/x.pdf`,userA);
    negatives.liquidationBudgetOrgMismatch = await sign(SA,'liquidation-report-files',`${liqX}/x.pdf`);
    // YPOP file whose redundant organization disagrees with its parent.
    await db.query("insert into ypop_files values($1,$2,$3,$4)",[uid(84),entry,orgB,`storage://ypop-files/${entry}/wrong-org.pdf`]);
    await obj('ypop-files',`${entry}/wrong-org.pdf`,userA);
    negatives.ypopRedundantOrgMismatch = await sign(SA,'ypop-files',`${entry}/wrong-org.pdf`);
    // Path-shape attacks and wrong bucket.
    negatives.traversal = await sign(SA,'budget-request-files',`${budget}/../${budget}/budget.pdf`);
    negatives.wrongBucket = await sign(SA,'liquidation-report-files',files.budget);
    negatives.unsupportedBucket = await sign(SA,'registration-seed-file','Endorsement.pdf');
    // Draft-state documents are not reviewable even for Super Admin.
    await db.query("update budget_requests set status='draft' where id=$1",[budget]);
    negatives.draftBudget = await sign(SA,'budget-request-files',files.budget);
    await db.query("update move_applications set status='draft' where id=$1",[move]);
    negatives.draftMove = await sign(SA,'move-files',files.move);
    for (const [k,v] of Object.entries(negatives)) assert.equal(v,false,k);

    // Direct RPC execution by browser roles is denied.
    for (const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query("select public.admin_authorize_storage_operation($1,'sign','budget-request-files',$2,null)",[SA,files.budget]),/permission denied/);
      await db.exec('reset role');
    }
    await mkdir(new URL('../../docs/staging-validation/2026-10-10/',import.meta.url),{recursive:true});
    await writeFile(new URL('../../docs/staging-validation/2026-10-10/admin-gateway-role-matrix.json',import.meta.url),JSON.stringify({
      scope:'Isolated PGlite: actual foundation RPC + captured live validate_admin_session_token, synthetic rows, noncryptographic digest. Not a deployed Edge Function/Storage API test.',
      liveRoleRegistryNote:'Live roles carry no renewals_manage and no MOVE permission code; renewal signing requires registrations_management, MOVE requires super_admin.',
      signingMatrix:matrix, revocationChecks:{permissionRemovedAfterLogin:'denied',accountDeactivatedAfterLogin:'denied'},
      negativeCases:Object.fromEntries(Object.keys(negatives).map(k=>[k,'denied'])) },null,2));
  } finally { await db.close(); }
});
