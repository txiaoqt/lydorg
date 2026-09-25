import glob
import re

PATTERNS = [
    (r'\bDOM\b', 'DOM'),
    (r'\bRPC\b', 'RPC'),
    (r'\bRPCs\b', 'RPCs'),
    (r'\bRLS\b', 'RLS'),
    (r'\bforeign key', 'foreign key'),
    (r'\bdatabase\b', 'database'),
    (r'\bschema\b', 'schema'),
    (r'\bsession token\b', 'session token'),
    (r'\btoken\b', 'token'),
    (r'\bguard\b', 'guard'),
    (r'\bguards\b', 'guards'),
    (r'\bquery string\b', 'query string'),
    (r'\bforged\b', 'forged'),
    (r'\bbackend\b', 'backend'),
    (r'\bSQL\b', 'SQL'),
]

for pyfile in sorted(glob.glob('scripts/gen_section_*.py')):
    with open(pyfile, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    matches = []
    for line_idx, line in enumerate(lines, 1):
        if line.strip().startswith('#'):
            continue
        for pat, name in PATTERNS:
            if re.search(pat, line, re.IGNORECASE):
                # check if it's test data or code
                matches.append((line_idx, name, line.strip()))
    
    if matches:
        print(f"\n==================== {pyfile} ({len(matches)} matches) ====================")
        for line_idx, name, text in matches:
            clean = text.encode('ascii', 'replace').decode('ascii')
            print(f"L{line_idx:4d} [{name}]: {clean}")
