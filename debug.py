with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Check for syntax issues - find the submitNote function area
idx = content.find('submitNote = async')
print(repr(content[idx:idx+1200]))
