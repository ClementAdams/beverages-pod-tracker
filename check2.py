with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('manifestNumber')
# find submitNote context
idx2 = content.find('submitNote')
print(repr(content[idx2:idx2+800]))
