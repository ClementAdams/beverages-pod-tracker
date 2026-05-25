with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: duplicate finally block
old = "    finally { setLoading(false); }\n    finally { setLoading(false); }"
count = content.count(old)
print("Duplicate finally found:", count)
if count == 1:
    content = content.replace(old, "    finally { setLoading(false); }", 1)
    print("OK: duplicate finally removed")
else:
    # find all finally occurrences for context
    import re
    for m in re.finditer(r'finally \{ setLoading\(false\); \}', content):
        print(f"  pos {m.start()}: ...{repr(content[m.start()-50:m.end()+20])}...")

# Fix 2: duplicate loading state
import re
matches = list(re.finditer(r'const \[loading, setLoading\] = useState\([^)]*\);', content))
print(f"\nloading state declarations: {len(matches)}")
for m in matches:
    print(f"  pos {m.start()}: {m.group()}")

if len(matches) == 2:
    # Remove the second occurrence
    second = matches[1]
    content = content[:second.start()] + content[second.end():]
    # clean up any double newline left behind
    content = content.replace('\n\n\n', '\n\n')
    print("OK: duplicate loading state removed")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("\nSaved. Finally count now:", content.count('finally { setLoading(false); }'))
