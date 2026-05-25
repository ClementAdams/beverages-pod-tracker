with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the plant emoji with plain text (it's inside JSX)
content = content.replace('\U0001f33f', '')

# Replace em-dashes in JSX text with plain hyphens
content = content.replace('\u2014', '-')

# The box-drawing chars (U+2500) are only in JS comments like // --- 
# They're safe in comments but let's replace them too to be safe
content = content.replace('\u2500', '-')

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
import re
non_ascii = [m.group() for m in re.finditer(r'[^\x00-\x7F]', content)]
print(f"Non-ASCII chars remaining: {len(non_ascii)}")
if non_ascii:
    print("Remaining:", set(non_ascii))
else:
    print("All clear - file is now pure ASCII")
print("File length:", len(content))
