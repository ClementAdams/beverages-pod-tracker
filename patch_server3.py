with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add collectionNoteNo to noteSchema
old = "  periodEnd: String,\n  createdDate: { type: Date, default: Date.now },"
new = "  periodEnd: String,\n  collectionNoteNo: String,\n  createdDate: { type: Date, default: Date.now },"
assert content.count(old) == 1, "FAIL: noteSchema"
content = content.replace(old, new, 1)
print("OK: collectionNoteNo field added to noteSchema")

# Pass collectionNoteNo when creating a Note
old = "    const { driverName, vehicleInfo, farmDestination, accountantEmail,\n            driverSignature, periodStart, periodEnd, manifestNumber } = req.body;\n    const selectedPods = await Pod.find({ podId: { $in: podIds } }).lean();\n    if (selectedPods.length === 0) return res.status(400).json({ error: 'No PODs selected' });\n\n    const note = await Note.create({\n      pods: selectedPods, driverName, vehicleInfo, farmDestination,\n      accountantEmail, manifestNumber, driverSignature, periodStart, periodEnd,"
new = "    const { driverName, vehicleInfo, farmDestination, accountantEmail,\n            driverSignature, periodStart, periodEnd, manifestNumber, collectionNoteNo } = req.body;\n    const selectedPods = await Pod.find({ podId: { $in: podIds } }).lean();\n    if (selectedPods.length === 0) return res.status(400).json({ error: 'No PODs selected' });\n\n    const note = await Note.create({\n      pods: selectedPods, driverName, vehicleInfo, farmDestination,\n      accountantEmail, manifestNumber, driverSignature, periodStart, periodEnd, collectionNoteNo,"
assert content.count(old) == 1, "FAIL: Note.create"
content = content.replace(old, new, 1)
print("OK: collectionNoteNo saved to Note on creation")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("server.js saved. Length:", len(content))
