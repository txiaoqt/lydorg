-- Adds the 'project_proposal' template scope: an admin-uploaded file that the
-- budget request form offers in its Detailed Project Proposal section.

alter table public.required_document_types
  drop constraint if exists required_document_types_template_scope_check;
alter table public.required_document_types
  add constraint required_document_types_template_scope_check
  check (template_scope = any (array['document_submission', 'move', 'other', 'project_proposal']));

-- Patch the scope allow-list in the live admin RPCs in place, so the rest of
-- each function body stays exactly as deployed.
do $$
declare
  fn text;
  def text;
begin
  foreach fn in array array[
    'public.create_admin_template_document(text,text,text,text,text)',
    'public.update_admin_template_document(text,uuid,text,text,text,text)'
  ] loop
    def := pg_get_functiondef(fn::regprocedure);
    if position('''project_proposal''' in def) > 0 then
      continue;
    end if;
    if position('in (''document_submission'', ''move'', ''other'')' in def) = 0 then
      raise exception 'Unexpected definition for %, scope allow-list not found', fn;
    end if;
    execute replace(def,
      'in (''document_submission'', ''move'', ''other'')',
      'in (''document_submission'', ''move'', ''other'', ''project_proposal'')');
  end loop;
end $$;
