with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

old = "    // Header\n    doc.fontSize(22).font('Helvetica-Bold').text('COLLECTION NOTE', { align: 'center' });\n    doc.moveDown(0.3);\n    doc.fontSize(10).font('Helvetica').text(`Note ID: ${note.noteId}`, { align: 'center' });"
new = """    // Header
    doc.fontSize(14).font('Helvetica-Bold').text('JOHENCAR TRANSPORT AND RECYCLING', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Beverage Waste Collection Services', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(22).font('Helvetica-Bold').text('COLLECTION NOTE', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').text(`Note ID: ${note.noteId}`, { align: 'center' });"""

assert content.count(old) == 1, "FAIL: header not found"
content = content.replace(old, new, 1)
print("OK: company name added to collection note PDF")

# Also add Collection Note number prominently if it exists
old = "    if (note.manifestNumber) {\n      doc.text(`Manifest Number: ${note.manifestNumber}`, { align: 'center' });\n    }"
new = """    if (note.collectionNoteNo) {
      doc.fontSize(12).font('Helvetica-Bold').text(`Collection Note #: ${note.collectionNoteNo}`, { align: 'center' });
      doc.fontSize(10).font('Helvetica');
    }
    if (note.manifestNumber) {
      doc.text(`Manifest Number: ${note.manifestNumber}`, { align: 'center' });
    }"""
assert content.count(old) == 1, "FAIL: manifest block not found"
content = content.replace(old, new, 1)
print("OK: Collection Note # added prominently to PDF")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Saved")
