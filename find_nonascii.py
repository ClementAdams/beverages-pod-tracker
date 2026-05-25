with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Find all non-ASCII characters and their positions
non_ascii = [(m.start(), m.group(), hex(ord(m.group()))) for m in re.finditer(r'[^\x00-\x7F]', content)]
print(f"Total non-ASCII chars: {len(non_ascii)}")

# Group by character
from collections import Counter
char_counts = Counter(m[1] for m in non_ascii)
print("Unique non-ASCII chars:")
for ch, count in char_counts.most_common():
    print(f"  U+{ord(ch):04X} '{ch.encode('unicode_escape').decode()}' x{count}")
