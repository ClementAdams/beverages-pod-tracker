with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken newline in csv join
old = "  const csv = rows.join('\n');"
new = "  const csv = rows.join('\\n');"
# Try both variants
if content.count(old) == 1:
    content = content.replace(old, new, 1)
    print("OK: fixed newline in csv join")
else:
    # Find whatever is there
    idx = content.find('rows.join(')
    print("Found:", repr(content[idx:idx+30]))

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
