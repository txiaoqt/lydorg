// LOCAL FILE GENERATION ONLY. Does not load credentials or contact any database.
import { readFile, writeFile } from 'node:fs/promises';
const base='docs/staging-validation/2026-10-11/document-mutation/';
const catalog=JSON.parse(await readFile(base+'staging-catalog.json','utf8'));
const writers=JSON.parse(await readFile(base+'document-writers.json','utf8'));
const names=['user_replace_document_submission_file','replace_organization_document_file','update_admin_document_submission_file_review','user_submit_renewal','user_resubmit_renewal'];
const rows=names.map(name=>catalog.functions.find(f=>f.name===name));
if(rows.some(r=>!r))throw new Error('Captured function missing');
const expected=[...rows,...['guard_submitted_registration_document_edits','admin_approve_renewal','promote_renewal_submission_files_for_review'].map(name=>catalog.functions.find(f=>f.name===name)),...['hard_delete_admin_template_document','delete_organization_account_canonical'].map(name=>writers.find(f=>f.name===name))];
const preflight=`-- REVIEW ONLY: unapplied forward security patch. No data repair or Storage policy changes.\nBEGIN;\nSET LOCAL lock_timeout='5s';\nSET LOCAL statement_timeout='30s';\nDO $gate$ DECLARE r record; BEGIN\n IF current_user<>'postgres' THEN RAISE EXCEPTION 'Reviewed postgres installation owner required'; END IF;\n FOR r IN SELECT * FROM (VALUES\n ${expected.map(r=>`('${r.signature}','${r.md5}')`).join(',\n ')}\n ) AS expected(signature,fingerprint) LOOP\n IF to_regprocedure(r.signature) IS NULL OR md5(pg_get_functiondef(to_regprocedure(r.signature))) IS DISTINCT FROM r.fingerprint THEN\n RAISE EXCEPTION 'Document mutation catalog drift: %',r.signature; END IF;\n END LOOP;\n IF to_regnamespace('ytrace_document_mutation') IS NOT NULL THEN RAISE EXCEPTION 'Patch namespace already exists; inspect before replay'; END IF;\nEND $gate$;\n`;
let renewal=rows[0].definition.replace("SET search_path TO 'public'","SET search_path TO 'pg_catalog', 'public', 'pg_temp'");
renewal=renewal.replace('  SELECT * INTO _old_file\n  FROM public.document_submission_files\n  WHERE id = _file_id;',`  SELECT * INTO _old_file FROM ytrace_document_mutation.lock_replacement(_file_id);`);
renewal=renewal.replace('IF _owner_id <> auth.uid() THEN','IF auth.uid() IS NULL OR _owner_id IS DISTINCT FROM auth.uid() THEN');
renewal=renewal.replace('  RETURN _updated_row;',`  INSERT INTO public.activity_logs(actor_user_id,organization_id,action,related_type,related_id,description,metadata)
  VALUES(NULL,_submission.organization_id,'Replaced document','document_submission_file',_file_id,
    'Organization replaced an editable document.',jsonb_build_object('actor_auth_user_id',auth.uid(),'actor_type','organization'));
  RETURN _updated_row;`);
let registration=rows[1].definition.replace("SET search_path TO 'public'","SET search_path TO 'pg_catalog', 'public', 'pg_temp'");
registration=registration.replace(/  select \* into _file\n  from public.document_submission_files\n  where id = _file_id\n  for update;/,'  select * into _file from ytrace_document_mutation.lock_replacement(_file_id);');
const support=await readFile(base+'guard-functions.sql','utf8');
let review=rows[2].definition.replace("SET search_path TO 'public'","SET search_path TO 'pg_catalog', 'public', 'pg_temp'");
review=review.replace('  -- Guard 1:',`  -- Serialize review with approval/replacement: renewal -> organization -> submission -> file.
  IF _renewal_id IS NOT NULL THEN
    PERFORM 1 FROM public.organization_renewals WHERE id=_renewal_id FOR UPDATE;
  END IF;
  PERFORM 1 FROM public.organization_profiles WHERE id=_org_id FOR UPDATE;
  PERFORM 1 FROM public.document_submissions WHERE id=_submission_id FOR UPDATE;
  PERFORM 1 FROM public.document_submission_files WHERE id=_file_id FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM public.document_submission_files f JOIN public.document_submissions s ON s.id=f.submission_id
    WHERE f.id=_file_id AND s.id=_submission_id AND s.organization_id=_org_id AND s.renewal_id IS NOT DISTINCT FROM _renewal_id) THEN
    RAISE EXCEPTION 'Document relationship changed'; END IF;
  SELECT admin_status,revision_requested_at,uploaded_at
    INTO _current_admin_status,_current_revision_requested_at,_current_uploaded_at
    FROM public.document_submission_files WHERE id=_file_id;
  -- Guard 1:`);
const grants=rows.slice(0,2).map(r=>`REVOKE ALL ON FUNCTION public.${r.signature} FROM PUBLIC,anon;\nGRANT EXECUTE ON FUNCTION public.${r.signature} TO authenticated;`).join('\n');
const submissions=rows.slice(3).map(r=>{
 let sql=r.definition.replace("SET search_path TO 'public'","SET search_path TO 'pg_catalog', 'public', 'pg_temp'");
 sql=sql.replace('BEGIN\n',"BEGIN\n  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Organization authentication required'; END IF;\n");
 sql=sql.replace('  SELECT op.user_id INTO _owner_id',`  PERFORM 1 FROM public.organization_profiles WHERE id=_renewal.organization_id FOR SHARE;
  IF NOT EXISTS(SELECT 1 FROM public.organization_profiles WHERE id=_renewal.organization_id
    AND user_id=auth.uid() AND profile_status::text<>'suspended_inactive') THEN
    RAISE EXCEPTION 'Organization is not authorized to submit documents'; END IF;
  IF coalesce(_renewal.revision_locked,false) OR (_renewal.revision_due_at<=clock_timestamp() AND _renewal.revision_unlocked_at IS NULL) THEN
    RAISE EXCEPTION 'Renewal revision is locked or overdue'; END IF;
  SELECT op.user_id INTO _owner_id`);
 sql=sql.replace('IF _owner_id <> auth.uid() THEN','IF _owner_id IS DISTINCT FROM auth.uid() THEN');
 return sql+';\n'+`REVOKE ALL ON FUNCTION public.${r.signature} FROM PUBLIC,anon;\nGRANT EXECUTE ON FUNCTION public.${r.signature} TO authenticated;`;
}).join('\n');
await writeFile('supabase/migrations/20261010183922_document_mutation_lifecycle_guard.sql',preflight+support+'\n'+renewal+';\n'+registration+';\n'+review+';\n'+submissions+'\n'+grants+'\nCOMMIT;\n');
console.log('Prepared local forward SQL from captured definitions; no remote operations.');
