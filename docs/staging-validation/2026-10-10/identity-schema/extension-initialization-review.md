# Migration connection initialization

The first transactional application failed with SQLSTATE 42501 while creating the function-level `pg_trgm.similarity_threshold` setting. Independent verification found no schema, functions, or migration history entry after rollback.

Read-only diagnosis showed the GUC absent from `pg_settings` before loading the already-installed extension. Calling `extensions.similarity('synthetic','synthetic')` registered it as context `user`. In a READ ONLY transaction, the same staging role then successfully set it locally to 0.82 and rolled back.

The reviewed correction adds only that read-only extension call in the migration connection. It changes no extension, role, grant, persistent setting, function body, or public object. One corrected application is justified by this successful probe; a further failure must stop rather than loop.
