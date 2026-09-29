-- Allow the portal to sign and preview the six immutable synthetic YORP seed PDFs.
-- Keep the fixture bucket private and expose only the explicitly mapped root objects.
CREATE POLICY yorp_sample_seed_assets_read
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'registration-seed-file'
  AND name IN (
    'Constitution and By-Laws.pdf',
    'Endorsement.pdf',
    'NYC YORP Registration Form (Form B).pdf',
    'Pasig City YORP Registration Form (Form A).pdf',
    'YORP Directory of Officers and Adviser.pdf',
    'YORP List of Members in Good Standing.pdf'
  )
);
