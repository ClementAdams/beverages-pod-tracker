with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the PDF table column section
idx = content.find('const col = {')
if idx > 0:
    print("FOUND col at index", idx)
    print(repr(content[idx:idx+300]))
else:
    print("col not found, searching for table...")
    idx2 = content.find('tableTop')
    print(repr(content[idx2:idx2+500]))
