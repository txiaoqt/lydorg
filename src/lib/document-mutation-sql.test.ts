import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const sql=readFileSync('supabase/migrations/20261010183922_document_mutation_lifecycle_guard.sql','utf8');
describe('document lifecycle SQL deployment contracts (not live authorization)',()=>{
 it('uses a forward transaction with drift and lock timeouts',()=>{
  expect(sql).toContain('Document mutation catalog drift');
  expect(sql).toContain("SET LOCAL lock_timeout='5s'");
  expect(sql.trim().endsWith('COMMIT;')).toBe(true);
 });
 it('both replacement paths invoke the private locked authorization helper',()=>{
  expect(sql.match(/FROM ytrace_document_mutation.lock_replacement\(_file_id\)/gi)).toHaveLength(2);
  expect(sql).toContain('REVOKE ALL ON FUNCTION ytrace_document_mutation.lock_replacement(uuid) FROM PUBLIC,anon,authenticated');
 });
 it('does not alter Storage policies, disable triggers or accept client overrides',()=>{
  expect(sql).not.toMatch(/(?:DROP|CREATE|ALTER) POLICY|DISABLE TRIGGER|set_config\(/i);
  expect(sql).not.toContain('app.allow_test_scenario_prep');
 });
 it('protects direct INSERT/UPDATE/DELETE and parent relationships',()=>{
  expect(sql).toContain('BEFORE INSERT OR UPDATE OR DELETE ON public.document_submission_files');
  expect(sql).toContain('BEFORE INSERT OR UPDATE OR DELETE ON public.document_submissions');
  expect(sql).toContain('Terminal renewal documents are immutable');
  expect(sql).toContain('Review history is server controlled');
 });
 it('catalog unlink never changes approved content and has no client flag',()=>{
  expect(sql).toContain("OLD.document_type_id IS NOT NULL AND NEW.document_type_id IS NULL");
  expect(sql).toContain("to_jsonb(NEW)-ARRAY['document_type_id','updated_at']");
  expect(sql).toContain('Review history is server controlled');
  expect(sql).toContain('hard_delete_admin_template_document(text,uuid)');
 });
 it('requires stored object ownership, size, type and a genuine new revision',()=>{
  expect(sql).toContain('FROM storage.objects');
  expect(sql).toContain('coalesce(_object.owner_id,_object.owner::text) IS DISTINCT FROM auth.uid()::text');
  expect(sql).toContain('Revision upload predates the request');
  expect(sql).toContain('A new revision upload is required');
 });
 it('preserves Admin session validation and adds ordered review locking',()=>{
  expect(sql).toContain('public.validate_admin_session_token(_session_token)');
  expect(sql).toContain('Serialize review with approval/replacement');
 });
});
