with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Add "farm" to User schema role enum ────────────────────────────────
old = "role: { type: String, enum: ['admin', 'crew'], default: 'crew' },"
new = "role: { type: String, enum: ['admin', 'crew', 'farm'], default: 'crew' },"
assert content.count(old) == 1, "FAIL 1"
content = content.replace(old, new, 1)
print("OK 1: farm role added to schema")

# ── 2. Add farmName field to Note schema ──────────────────────────────────
old = "  periodEnd: String,\n  collectionNoteNo: String,"
new = "  periodEnd: String,\n  collectionNoteNo: String,\n  farmName: String,"
assert content.count(old) == 1, "FAIL 2"
content = content.replace(old, new, 1)
print("OK 2: farmName added to Note schema")

# ── 3. Save farmName when creating collection note ────────────────────────
old = "      accountantEmail, manifestNumber, driverSignature, periodStart, periodEnd, collectionNoteNo,"
new = "      accountantEmail, farmEmail, myEmail, manifestNumber, driverSignature, periodStart, periodEnd, collectionNoteNo, farmName,"
assert content.count(old) == 1, "FAIL 3"
content = content.replace(old, new, 1)
print("OK 3: farmName passed to Note.create")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Phase 1 saved")
