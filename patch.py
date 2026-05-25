with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add nextNoteSeq state before dupWarning
old = "  const [dupWarning, setDupWarning] = useState(null);"
new = "  const [nextNoteSeq, setNextNoteSeq] = useState(() => parseInt(localStorage.getItem('nextNoteSeq') || '64'));\n  const [dupWarning, setDupWarning] = useState(null);"
assert content.count(old) == 1, "FAIL step 1"
content = content.replace(old, new, 1)
print("OK 1. nextNoteSeq state added")

# 2. Add farmEmail + myEmail to noteForm initial state
old = "const [noteForm, setNoteForm] = useState({ driverName: '', vehicleInfo: '', farmDestination: '', accountantEmail: 'ch1wasteservice@gmail.com', periodStart: '', periodEnd: '', manifestNumber: '', manifestPhoto: null });"
new = "const [noteForm, setNoteForm] = useState({ driverName: '', vehicleInfo: '', farmDestination: '', accountantEmail: 'ch1wasteservice@gmail.com', farmEmail: '', myEmail: '', periodStart: '', periodEnd: '', manifestNumber: '', manifestPhoto: null });"
assert content.count(old) == 1, "FAIL step 2"
content = content.replace(old, new, 1)
print("OK 2. farmEmail + myEmail added to noteForm state")

# 3. Add collectionNoteNo generation in submitNote
old = "    if (!noteForm.manifestNumber) { alert('Manifest number is required'); return; }\n    setLoading(true);\n    try {\n      const fd = new FormData();"
new = "    if (!noteForm.manifestNumber) { alert('Manifest number is required'); return; }\n    setLoading(true);\n    try {\n      const collectionNoteNo = nextNoteSeq.toString();\n      const fd = new FormData();"
assert content.count(old) == 1, "FAIL step 3"
content = content.replace(old, new, 1)
print("OK 3. collectionNoteNo generation added")

# 4. Append collectionNoteNo to FormData
old = "      fd.append('podIds', JSON.stringify(selectedPodIds));\n      const res = await api('/api/collection-note'"
new = "      fd.append('podIds', JSON.stringify(selectedPodIds));\n      fd.append('collectionNoteNo', collectionNoteNo);\n      const res = await api('/api/collection-note'"
assert content.count(old) == 1, "FAIL step 4"
content = content.replace(old, new, 1)
print("OK 4. collectionNoteNo appended to FormData")

# 5. Increment sequence after success
old = "      flash('Collection Note created and emailed! PODs have been archived.');\n      setView('dashboard');"
new = "      const newSeq = nextNoteSeq + 1;\n      setNextNoteSeq(newSeq);\n      localStorage.setItem('nextNoteSeq', newSeq.toString());\n      flash('Collection Note created and emailed! PODs have been archived.');\n      setView('dashboard');"
assert content.count(old) == 1, "FAIL step 5"
content = content.replace(old, new, 1)
print("OK 5. Sequence increment added")

# 6. Reset noteForm to include new fields
old = "      setNoteForm({ driverName: '', vehicleInfo: '', farmDestination: '', accountantEmail: 'ch1wasteservice@gmail.com', periodStart: '', periodEnd: '', manifestNumber: '', manifestPhoto: null });"
new = "      setNoteForm({ driverName: '', vehicleInfo: '', farmDestination: '', accountantEmail: 'ch1wasteservice@gmail.com', farmEmail: '', myEmail: '', periodStart: '', periodEnd: '', manifestNumber: '', manifestPhoto: null });"
assert content.count(old) == 1, "FAIL step 6"
content = content.replace(old, new, 1)
print("OK 6. noteForm reset updated")

# 7. Add Farm Email + My Email UI fields
old = "            <div style={S.field}><label style={S.label}>Accountant Email</label><input style={S.input} type=\"email\" placeholder=\"accountant@email.com\" value={noteForm.accountantEmail} onChange={e => setNoteForm({...noteForm, accountantEmail: e.target.value})} /></div>\n          </div>"
new = "            <div style={S.field}><label style={S.label}>Accountant Email</label><input style={S.input} type=\"email\" placeholder=\"accountant@email.com\" value={noteForm.accountantEmail} onChange={e => setNoteForm({...noteForm, accountantEmail: e.target.value})} /></div>\n            <div style={S.field}><label style={S.label}>Farm Email</label><input style={S.input} type=\"email\" placeholder=\"farm@email.com\" value={noteForm.farmEmail} onChange={e => setNoteForm({...noteForm, farmEmail: e.target.value})} /></div>\n            <div style={S.field}><label style={S.label}>My Email</label><input style={S.input} type=\"email\" placeholder=\"my@email.com\" value={noteForm.myEmail} onChange={e => setNoteForm({...noteForm, myEmail: e.target.value})} /></div>\n          </div>"
assert content.count(old) == 1, "FAIL step 7"
content = content.replace(old, new, 1)
print("OK 7. Farm Email + My Email UI fields added")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("ALL DONE - file saved")
print("New length:", len(content))
