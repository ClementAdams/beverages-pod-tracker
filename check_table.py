with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Print the full table section so we can see exact current state
idx = content.find('// POD Summary Table')
print(repr(content[idx:idx+1500]))
