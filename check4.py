with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.rfind('const PORT')
print(content[idx-100:idx+30].encode('ascii', errors='replace').decode())
