with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

total = len(lines)
print(f"Total lines: {total}")

# Check for any non-ASCII
import re
for i, l in enumerate(lines, start=1):
    bad = re.findall(r'[^\x00-\x7F]', l)
    if bad:
        print(f"Line {i} non-ASCII: {bad} -> {l.rstrip()}")

# Print lines 280-350 (where certCanvas helpers and submitCert live)
print("\n=== Lines 280-360 ===")
for i, l in enumerate(lines[279:360], start=280):
    print(f"{i}: {l}", end='')
