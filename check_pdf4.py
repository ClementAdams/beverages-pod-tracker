with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('generateCollectionPDF')
print(content[idx:idx+3000])
