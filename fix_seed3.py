with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

old = "  console.log('User setup complete');\n  if (false;\n  }\n});"
new = "  console.log('User setup complete');\n});"
assert content.count(old) == 1, "FAIL"
content = content.replace(old, new, 1)
print("OK: cleaned up seed block")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
