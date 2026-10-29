// Local proposal generation only; no credentials, SQL execution or network.
import { readFile,writeFile } from 'node:fs/promises';
const base='docs/staging-validation/2026-10-11/document-mutation/';
const e=JSON.parse(await readFile(base+'fixture-reconciliation-evidence.json','utf8'));
const snapshot=JSON.parse(await readFile(base+'fresh-sql-snapshot.json','utf8'));
const proof=JSON.parse(await readFile(base+'fixture-readonly-verification.json','utf8'));
if(e.projectRef!=='zroudsvpswqsjlyttkjf'||e.target.id!=='bf21c513-6466-44ac-9487-c791544ee4ad'||proof.hashes.find(h=>h.kind==='renewal-corrected')?.sha256!==e.corrected.sha256)throw new Error('Exact reviewed evidence required');
const latest=e.target.revision_history.at(-1);
if(latest.previousFileUrl!==e.corrected.storageUri||latest.previousStatus!=='approved_green')throw new Error('Approved historical metadata missing');
const sql=`-- PROPOSAL ONLY. Separate approval and fresh synthetic binary hash verification required.
-- STAGING ONLY zroudsvpswqsjlyttkjf. Execute via fixed verified control plane.
-- Run INSIDE the patch transaction, BEFORE its first CREATE SCHEMA statement.
-- Never execute alone or after installing the terminal guard. No trigger bypass.
-- Requires transaction-level table locks below; installation follows before COMMIT.
LOCK TABLE public.organization_renewals,public.document_submissions,public.document_submission_files IN ACCESS EXCLUSIVE MODE;
DO $reconcile$
DECLARE f public.document_submission_files; expected public.document_submission_files;
 h jsonb; o storage.objects; before_terms jsonb; before_renewal jsonb; before_parent jsonb; before_others jsonb;
BEGIN
 IF current_user<>'postgres' OR to_regnamespace('ytrace_document_mutation') IS NOT NULL THEN
   RAISE EXCEPTION 'Reviewed maintenance owner and pre-patch transaction required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.admin_accounts a JOIN public.roles r ON r.id=a.role_id
   WHERE a.id='f3cd6008-41ee-46dd-969d-35f86bacf063' AND a.username='staging-super-admin'
   AND a.email='ytrace-staging-super-admin@example.invalid' AND a.is_active AND a.is_password_set AND r.code='super_admin') THEN
   RAISE EXCEPTION 'Exact staging anchor missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM ytrace_staging_renewal.fixture b JOIN public.organization_profiles p ON p.id=b.organization_id
   JOIN auth.users u ON u.id=b.user_id AND p.user_id=u.id WHERE b.organization_id='${e.organizationId}'
   AND u.email='ytrace-renewal-synthetic@example.invalid'
   AND u.raw_app_meta_data->>'ytrace_renewal_fixture'='zroudsvpswqsjlyttkjf-v1') THEN
   RAISE EXCEPTION 'Trusted dedicated synthetic fixture missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.organization_renewals WHERE id='${e.renewal.id}' AND organization_id='${e.organizationId}' AND cycle_number=2 AND status='approved')
 OR NOT EXISTS(SELECT 1 FROM public.document_submissions WHERE id='${e.submission.id}' AND organization_id='${e.organizationId}' AND renewal_id='${e.renewal.id}' AND status='approved_green') THEN
   RAISE EXCEPTION 'Expected approved parent state missing'; END IF;
 expected:=jsonb_populate_record(NULL::public.document_submission_files,$expected$${JSON.stringify(snapshot.target)}$expected$::jsonb);
 SELECT * INTO f FROM public.document_submission_files WHERE id=expected.id FOR UPDATE;
 IF f IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Exact target metadata drift; stop repair'; END IF;
 IF (SELECT count(*) FROM public.document_submission_files WHERE submission_id=f.submission_id)<>6
   OR (SELECT count(*) FROM public.document_submission_files WHERE submission_id=f.submission_id AND id<>f.id AND admin_status='approved_green')<>5 THEN
   RAISE EXCEPTION 'Expected five preserved approved files missing'; END IF;
 h:=f.revision_history->-1;
 IF h->>'previousFileUrl'<>$uri$${e.corrected.storageUri}$uri$ OR h->>'previousStatus'<>'approved_green'
   OR h->>'previousFileName'<>'SYNTHETIC-renewal-corrected.pdf' OR (h->>'previousFileSize')::bigint<>674
   OR h->>'previousFileType'<>'application/pdf' OR nullif(h->>'reviewedAt','') IS NULL THEN
   RAISE EXCEPTION 'Historical approved correction evidence differs'; END IF;
 SELECT * INTO o FROM storage.objects WHERE bucket_id='organization-documents' AND name=$path$${e.corrected.path}$path$ FOR SHARE;
 IF o.id IS NULL OR o.created_at IS NULL OR (o.metadata->>'size')::bigint IS DISTINCT FROM 674::bigint OR o.metadata->>'mimetype' IS DISTINCT FROM 'application/pdf'
   OR coalesce(o.owner_id,o.owner::text) IS DISTINCT FROM (SELECT user_id::text FROM public.organization_profiles WHERE id='${e.organizationId}') THEN
   RAISE EXCEPTION 'Corrected synthetic Storage object differs'; END IF;
 PERFORM 1 FROM public.organization_profiles WHERE id='${e.organizationId}' FOR UPDATE;
 PERFORM 1 FROM public.organization_accreditations WHERE organization_id='${e.organizationId}' FOR UPDATE;
 SELECT jsonb_agg(to_jsonb(a) ORDER BY id) INTO before_terms FROM public.organization_accreditations a WHERE organization_id='${e.organizationId}';
 SELECT to_jsonb(r) INTO before_renewal FROM public.organization_renewals r WHERE id='${e.renewal.id}';
 SELECT to_jsonb(s) INTO before_parent FROM public.document_submissions s WHERE id='${e.submission.id}';
 SELECT jsonb_agg(to_jsonb(x) ORDER BY id) INTO before_others FROM public.document_submission_files x WHERE id<>f.id;
 IF jsonb_array_length(before_terms)<>2 OR NOT EXISTS(SELECT 1 FROM public.organization_accreditations WHERE organization_id='${e.organizationId}' AND term_number=1 AND status='superseded')
   OR NOT EXISTS(SELECT 1 FROM public.organization_accreditations WHERE organization_id='${e.organizationId}' AND term_number=2 AND status='active') THEN
   RAISE EXCEPTION 'Expected preserved accreditation transition missing'; END IF;
 UPDATE public.document_submission_files SET file_url=h->>'previousFileUrl',file_name=h->>'previousFileName',
   file_type=h->>'previousFileType',file_size=(h->>'previousFileSize')::bigint,admin_status='approved_green',
   reviewed_at=(h->>'reviewedAt')::timestamptz,admin_remarks=h->>'adminRemarks',uploaded_at=o.created_at,updated_at=clock_timestamp()
   WHERE id=f.id;
 INSERT INTO public.activity_logs(actor_user_id,organization_id,action,related_type,related_id,description,metadata)
 VALUES(NULL,'${e.organizationId}','reconciled_synthetic_approved_document','document_submission_file',f.id,
   'Approved staging-only reconciliation of the terminal replacement security-test mutation.',
   jsonb_build_object('actor_type','authorized_staging_maintenance','before',to_jsonb(f),
     'after',(SELECT to_jsonb(x) FROM public.document_submission_files x WHERE id=f.id),
     'corrected_sha256','${e.corrected.sha256}','hash_source','fresh read-only binary verification required before execution',
     'uploaded_at_source','Storage object created_at; exact previous metadata timestamp unavailable',
     'evidence','document-mutation/fixture-readonly-verification.json'));
 IF (SELECT revision_history FROM public.document_submission_files WHERE id=f.id) IS DISTINCT FROM f.revision_history
 OR (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM public.document_submission_files x WHERE id<>f.id) IS DISTINCT FROM before_others
 OR (SELECT to_jsonb(s) FROM public.document_submissions s WHERE id='${e.submission.id}') IS DISTINCT FROM before_parent
 OR (SELECT to_jsonb(r) FROM public.organization_renewals r WHERE id='${e.renewal.id}') IS DISTINCT FROM before_renewal
 OR (SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM public.organization_accreditations a WHERE organization_id='${e.organizationId}') IS DISTINCT FROM before_terms THEN
   RAISE EXCEPTION 'Preservation invariant failed; transaction must roll back'; END IF;
END $reconcile$;
`;
await writeFile(base+'proposed-staging-reconciliation.sql',sql);
console.log('Prepared exact-row staging reconciliation proposal; not executed.');
