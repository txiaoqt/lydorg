# Offline diagnostic revision 2 — NOT AUTHORIZED

This isolated fixture-only copy adds sanitized cleanup-failure reporting and preserves a numeric Win32 error when the fixture source-open call fails. It has not been compiled or run. It is not production-ready and does not diagnose the earlier Run 03 failure.

Any separately authorized future capture should contain only sanitized harness output, exit status, UTC start/end timestamps, and the fixture-source and harness SHA-256 values. It must omit the command line, runtime or script path, working directory, temp directory path, user identity, environment values, credentials, and file contents.

Cleanup exceptions are reported through the sanitized diagnostic fields, increment the failure count, and are not retried or reported as successful cleanup. The script cannot sanitize a PowerShell parser or process-start failure that occurs before its bootstrap code runs; a future capture layer must not pass through raw process stderr or infer success when no sanitized harness result exists.

The historical Run 03 log and provenance remain in the earlier candidate unchanged; they contain absolute path data and must not be treated as a sanitized future capture. The earlier one-run authorization is consumed. This copy authorizes no execution.
