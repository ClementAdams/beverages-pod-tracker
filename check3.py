with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()
print('nextNoteSeq in file:', 'nextNoteSeq' in content)
print('const [nextNoteSeq' in content)
# find it
idx = content.find('nextNoteSeq')
print(repr(content[max(0,idx-10):idx+80]))
