with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Check for duplicate finally blocks (was in original)
print("duplicate finally count:", content.count('finally { setLoading(false); }'))

# Check noteForm state line
idx = content.find('useState({ driverName')
print("noteForm state:", repr(content[idx:idx+200]))

# Check nextNoteSeq
idx2 = content.find('nextNoteSeq')
print("nextNoteSeq line:", repr(content[idx2:idx2+100]))

# Check farm/my email in UI
print("farmEmail UI present:", 'Farm Email' in content)
print("myEmail UI present:", 'My Email' in content)
