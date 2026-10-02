-- The PCYDO data request is a registration/data-form template, not a renewal
-- packet requirement. Keep the renewal checklist driven by configured scope.
UPDATE public.required_document_types
SET
  scope = 'registration',
  template_category = ARRAY['data_form']::text[]
WHERE lower(trim(name)) = 'pcydo yorp data request form';
