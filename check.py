with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

print('File loaded, length:', len(content))
print('Has nextNoteSeq:', 'nextNoteSeq' in content)
print('Has farmEmail:', 'farmEmail' in content)
print('Has collectionNoteNo:', 'collectionNoteNo' in content)
