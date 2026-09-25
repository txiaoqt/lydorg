import glob
import re

scripts = sorted(glob.glob('scripts/gen_section_*.py'))
print(f"Scanning {len(scripts)} generator scripts...\n")

patterns = {
    "PWA route (/app/)": re.compile(r'/app/[a-zA-Z0-9_\-\*]+', re.IGNORECASE),
    "PWA mention (in test case)": re.compile(r'\bPWA\b|\bPwa\b|\bmobile app\b', re.IGNORECASE),
    "Wrong Contact route (/contact-us)": re.compile(r'/contact-us\b', re.IGNORECASE),
    "Wrong Public Budget (/budget without -transparency)": re.compile(r'/budget\b(?!-transparency|-request|-utilization|-monitoring)', re.IGNORECASE),
    "Wrong Public News (/news without -releases)": re.compile(r'/news\b(?!-releases)', re.IGNORECASE),
    "Wrong YPOP admin (/admin/ypop-review)": re.compile(r'/admin/ypop-review\b', re.IGNORECASE),
    "Wrong Admin Dashboard (/admin/dashboard)": re.compile(r'/admin/dashboard\b', re.IGNORECASE),
    "Implementation word (database)": re.compile(r'\bdatabase\b', re.IGNORECASE),
    "Implementation word (RPC)": re.compile(r'\bRPC\b'),
    "Implementation word (Supabase)": re.compile(r'\bSupabase\b', re.IGNORECASE),
    "Implementation word (storage bucket)": re.compile(r'\bstorage bucket\b', re.IGNORECASE),
    "Implementation word (403 Forbidden)": re.compile(r'\b403\b', re.IGNORECASE),
    "Implementation word (HTTP 200)": re.compile(r'\bHTTP\s*200\b|\b200\s*OK\b', re.IGNORECASE),
    "Implementation word (localStorage)": re.compile(r'\blocalStorage\b', re.IGNORECASE),
    "Implementation word (React state)": re.compile(r'\bReact state\b|\blocals? state\b', re.IGNORECASE),
    "Exact CSS pixel hit target (44x44)": re.compile(r'44\s*[x×]\s*44', re.IGNORECASE),
    "Breakpoint assertion ('breakpoint is')": re.compile(r'breakpoint is\b', re.IGNORECASE),
}

total_findings = 0

for script_path in scripts:
    with open(script_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    script_findings = []
    in_test_cases = False
    
    for idx, line in enumerate(lines, 1):
        # We only care about executable test case definitions (inside cases list)
        if "cases = [" in line or "cases.append" in line:
            in_test_cases = True
        
        # Check if line is within test case definitions
        for name, pat in patterns.items():
            matches = pat.findall(line)
            if matches:
                # Check context: ignore document title or explanatory scope docstrings
                if "Document Scope & System Rules" in line or "IMPORTANT SCOPE NOTE" in line:
                    continue
                if name == "PWA mention (in test case)" and ("PWA IS EXCLUDED" in line or "PWA is excluded" in line or "PWA (" in line and "excluded" in line):
                    continue
                script_findings.append((idx, name, matches, line.strip()))
    
    if script_findings:
        print(f"=== {script_path} ({len(script_findings)} issues) ===")
        for line_num, name, matches, text in script_findings:
            print(f"  Line {line_num} [{name}]: {matches} -> {text[:100]}")
        total_findings += len(script_findings)
    else:
        print(f"OK: {script_path}")

print(f"\nTotal potential findings: {total_findings}")
