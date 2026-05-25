with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Search for the PDF generation function
idx = content.find('generateCollectionPDF')
if idx < 0:
    idx = content.find('collection-note')
    print("Found collection-note at:", idx)
    print(repr(content[idx:idx+200]))
else:
    print("Found generateCollectionPDF at:", idx)
    # Print a big chunk to see the full PDF code
    chunk = content[idx:idx+5000]
    print(chunk)
