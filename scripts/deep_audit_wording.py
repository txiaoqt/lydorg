import os
import glob
import re

KEYWORDS = [
    r'\bDOM\b',
    r'\bRPC\b',
    r'\bRPCs\b',
    r'\bRLS\b',
    r'\bforeign key\b',
    r'\bdatabase row\b',
    r'\bdatabase table\b',
    r'\bdatabase transaction\b',
    r'\bdatabase records\b',
    r'\bschema\b',
    r'\bsession state\b',
    r'\bsession token\b',
    r'\btoken-authenticated\b',
    r'\bToken-Authenticated\b',
    r'\brouting guard\b',
    r'\bauthentication guard\b',
    r'\brouter guard\b',
    r'\bquery string\b',
    r'\bforged\b',
    r'REG-YYYY-NNNN',
    r'internal registration reference',
    r'bypass authentication',
    r'Observe application routing behavior',
    r'inspect exported schema',
]

print("=== SCANNING GENERATOR SCRIPTS ===")
for pyfile in sorted(glob.glob('scripts/gen_section_*.py')):
    with open(pyfile, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    found = []
    for line_no, line in enumerate(lines, 1):
        if line.strip().startswith('#'):
            continue
        for kw in KEYWORDS:
            if re.search(kw, line, re.IGNORECASE):
                found.append((line_no, kw, line.strip()))
    
    if found:
        print(f"\n[{os.path.basename(pyfile)}] ({len(found)} matches):")
        for line_no, kw, text in found:
            clean_text = text.encode('ascii', 'replace').decode('ascii')
            print(f"  Line {line_no:4d} [{kw}]: {clean_text[:120]}")
