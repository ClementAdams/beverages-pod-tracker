with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

old = """    doc.fontSize(10).font('Helvetica').text(`Note ID: ${note.noteId}`, { align: 'center' });
    doc.text(`Date Created: ${new Date(note.createdDate).toLocaleDateString()}`, { align: 'center' });
    doc.text(`Period: ${note.periodStart || ''} to ${note.periodEnd || ''}`, { align: 'center' });
    if (note.collectionNoteNo) {
      doc.fontSize(12).font('Helvetica-Bold').text(`Collection Note #: ${note.collectionNoteNo}`, { align: 'center' });
      doc.fontSize(10).font('Helvetica');
    }
    if (note.manifestNumber) {
      doc.text(`Manifest Number: ${note.manifestNumber}`, { align: 'center' });
    }"""

new = """    doc.fontSize(14).font('Helvetica-Bold').text(`Collection Note: ${note.collectionNoteNo || 'COL065'}`, { align: 'center' });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Date Created: ${new Date(note.createdDate).toLocaleDateString()}`, { align: 'center' });
    doc.text(`Period: ${note.periodStart || ''} to ${note.periodEnd || ''}`, { align: 'center' });
    if (note.manifestNumber) {
      doc.text(`Manifest Number: ${note.manifestNumber}`, { align: 'center' });
    }"""

assert content.count(old) == 1, "FAIL: " + str(content.count(old))
content = content.replace(old, new, 1)
print("OK: header updated - Collection Note number now always visible")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Saved.")
