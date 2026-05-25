with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Add "farm" role option to admin user creation ─────────────────────
old = "<option value=\"crew\">Crew</option><option value=\"admin\">Admin</option>"
new = "<option value=\"crew\">Crew</option><option value=\"admin\">Admin</option><option value=\"farm\">Farm</option>"
assert content.count(old) == 1, "FAIL 1"
content = content.replace(old, new, 1)
print("OK 1: Farm role option added to admin panel")

# ── 2. Add farmName field to collection note form submission ──────────────
old = "      fd.append('collectionNoteNo', collectionNoteNo);\n      const res = await api('/api/collection-note'"
new = "      fd.append('collectionNoteNo', collectionNoteNo);\n      fd.append('farmName', noteForm.farmDestination);\n      const res = await api('/api/collection-note'"
assert content.count(old) == 1, "FAIL 2"
content = content.replace(old, new, 1)
print("OK 2: farmName sent with collection note")

# ── 3. Add Sage CSV download button to each note in History ──────────────
old = "                    <button style={S.btnSec} onClick={() => { setResendModal(n.noteId); setResendEmail(n.accountantEmail || ''); }}>Resend Email</button>"
new = """                    <button style={S.btnSec} onClick={() => { setResendModal(n.noteId); setResendEmail(n.accountantEmail || ''); }}>Resend Email</button>
                    <button style={{...S.btnSm, backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7'}} onClick={() => { const t = localStorage.getItem('pod_token'); window.open('/api/collection-note/' + n.noteId + '/sage-csv?token=' + t, '_blank'); }}>Sage CSV</button>"""
assert content.count(old) == 1, "FAIL 3"
content = content.replace(old, new, 1)
print("OK 3: Sage CSV button added to History")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Frontend phase 1 saved")
