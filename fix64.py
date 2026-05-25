with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

old = "note.collectionNoteNo || 'COL065'"
new = "note.collectionNoteNo || 'COL064'"
assert content.count(old) == 1, "FAIL: " + str(content.count(old))
content = content.replace(old, new, 1)
print("OK")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Saved.")
