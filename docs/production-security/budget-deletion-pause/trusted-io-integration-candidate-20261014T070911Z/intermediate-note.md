# Preserved intermediate protocol model

NON-RUNNABLE — NOT AUTHORIZED. This is an intermediate artifact from the offline trusted-I/O review, not an execution package.

The three source files and both 51/51 passing synthetic test logs are preserved byte-for-byte. Static review identified a diagnostic accounting issue: a denied repeat callback incremented its reported dispatch counter before the limit check, although the provider was never called. The later candidate checks the limit first and counts only dispatched calls, and adds five regression cases. No real runner, I/O provider, protected state, or production operation was involved.

The logs here are historical results for this exact intermediate revision. Do not attribute the later revision or its test results to this directory. No authorization is provided.
