with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract just the babel script
script_start = content.find('<script type="text/babel">') + len('<script type="text/babel">')
script_end = content.rfind('</script>')
script = content[script_start:script_end]

# Write it as a plain JS file so Node can try to parse it
with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\test_parse.js', 'w', encoding='utf-8') as f:
    f.write(script)

print("Script extracted, length:", len(script))
print("Lines:", script.count('\n'))
