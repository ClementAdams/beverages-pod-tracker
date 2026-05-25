with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Check non-ASCII
bad = re.findall(r'[^\x00-\x7F]', content)
print("Non-ASCII chars:", len(bad), set(bad) if bad else "NONE")

# Find loading declarations with context
for m in re.finditer(r'const \[loading', content):
    line_no = content[:m.start()].count('\n') + 1
    ctx = content[m.start()-30:m.end()+60].replace('\n','|')
    print(f"  Line {line_no}: {ctx}")

# Verify they are in different functions
print("\nFile is", len(content), "bytes,", content.count('\n'), "lines")
print("PURE ASCII:", len(bad) == 0)
