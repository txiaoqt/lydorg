import glob
import docx
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')
docx_files = sorted(glob.glob("*_YTRACE_*_Black_Box_Test_Cases.docx"))
print(f"Auditing {len(docx_files)} DOCX files directly...\n")

patterns = {
    "PWA route (/app/)": re.compile(r'/app/[a-zA-Z0-9_\-\*]+', re.IGNORECASE),
    "Wrong Contact route (/contact-us)": re.compile(r'/contact-us\b', re.IGNORECASE),
    "Wrong Public Budget (/budget)": re.compile(r'/budget\b(?!-transparency|-request|-utilization|-monitoring)', re.IGNORECASE),
    "Wrong Public News (/news)": re.compile(r'/news\b(?!-releases)', re.IGNORECASE),
    "Wrong YPOP admin (/admin/ypop-review)": re.compile(r'/admin/ypop-review\b', re.IGNORECASE),
    "Wrong Admin Dashboard (/admin/dashboard)": re.compile(r'/admin/dashboard\b', re.IGNORECASE),
    "Tech word (database)": re.compile(r'\bdatabase\b', re.IGNORECASE),
    "Tech word (RPC)": re.compile(r'\bRPC\b'),
    "Tech word (Supabase)": re.compile(r'\bSupabase\b', re.IGNORECASE),
    "Tech word (storage bucket)": re.compile(r'\bstorage bucket\b', re.IGNORECASE),
    "Tech word (403 Forbidden)": re.compile(r'\b403\b', re.IGNORECASE),
    "Tech word (HTTP 200)": re.compile(r'\bHTTP\s*200\b|\b200\s*OK\b', re.IGNORECASE),
    "Tech word (localStorage)": re.compile(r'\blocalStorage\b', re.IGNORECASE),
    "Tech word (React state)": re.compile(r'\bReact state\b|\blocal state\b', re.IGNORECASE),
    "Pixel hit target (44x44)": re.compile(r'44\s*[x×]\s*44', re.IGNORECASE),
    "Breakpoint claim ('breakpoint is')": re.compile(r'breakpoint is\b', re.IGNORECASE),
}

total_docx_issues = 0

for doc_path in docx_files:
    doc = docx.Document(doc_path)
    issues = []
    
    for t_idx, table in enumerate(doc.tables):
        # We check each cell in table
        for r_idx, row in enumerate(table.rows):
            for c_idx, cell in enumerate(row.cells):
                cell_text = cell.text
                
                # Check for Actual Result value
                if "Actual Result:" in cell_text:
                    val = cell_text.replace("Actual Result:", "").strip()
                    if val != "Not Yet Tested":
                        issues.append((t_idx, f"Invalid Actual Result: '{val}'"))
                
                # Check patterns
                for name, pat in patterns.items():
                    # Skip check if this is the TOC table (usually table 0) or title block
                    if t_idx == 0:
                        continue
                    m = pat.findall(cell_text)
                    if m:
                        # Exclude harmless notes if any
                        first_line = cell_text.split('\n')[0][:80]
                        issues.append((t_idx, f"[{name}] {m} in table {t_idx} row {r_idx}: {first_line}"))
    
    if issues:
        print(f"=== {doc_path} ({len(issues)} issues) ===")
        for t_idx, desc in issues:
            print(f"  {desc}")
        total_docx_issues += len(issues)
    else:
        print(f"CLEAN: {doc_path}")

print(f"\nTotal docx issues found: {total_docx_issues}")
