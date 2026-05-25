with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Add certs state to MainApp ─────────────────────────────────────────
old = "  const [notes, setNotes] = useState([]);"
new = "  const [notes, setNotes] = useState([]);\n  const [certs, setCerts] = useState([]);"
assert content.count(old) == 1, "FAIL: notes state"
content = content.replace(old, new, 1)
print("OK 1. certs state added")

# ── 2. Add loadCerts function ─────────────────────────────────────────────
old = "  const loadNotes = () => api('/api/collection-notes').then(r => r.json()).then(setNotes).catch(() => {});"
new = "  const loadNotes = () => api('/api/collection-notes').then(r => r.json()).then(setNotes).catch(() => {});\n  const loadCerts = () => api('/api/destruction-certs').then(r => r.json()).then(setCerts).catch(() => {});"
assert content.count(old) == 1, "FAIL: loadNotes"
content = content.replace(old, new, 1)
print("OK 2. loadCerts added")

# ── 3. Call loadCerts on init ─────────────────────────────────────────────
old = "  useEffect(() => { loadPods(); loadNotes(); loadStats(); if (isOnline && offlineQueue.length > 0) syncOfflineQueue(); }, []);"
new = "  useEffect(() => { loadPods(); loadNotes(); loadCerts(); loadStats(); if (isOnline && offlineQueue.length > 0) syncOfflineQueue(); }, []);"
assert content.count(old) == 1, "FAIL: useEffect"
content = content.replace(old, new, 1)
print("OK 3. loadCerts called on init")

# ── 4. Add downloadCertPdf function ──────────────────────────────────────
old = "  const downloadPdf = (noteId) => {"
new = "  const downloadCertPdf = (certId) => { const token = localStorage.getItem('pod_token'); window.open('/api/destruction-cert/' + certId + '/pdf?token=' + token, '_blank'); };\n\n  const downloadPdf = (noteId) => {"
assert content.count(old) == 1, "FAIL: downloadPdf"
content = content.replace(old, new, 1)
print("OK 4. downloadCertPdf added")

# ── 5. Update History view to also show certs + show collectionNoteNo ─────
old = "          {notes.length === 0 ? <p style={S.muted}>No collection notes yet.</p> : (\n            <div>{notes.map(n => (\n              <div key={n.noteId} style={S.noteCard}>\n                <div style={{ marginBottom: 8 }}>\n                  <p style={{margin: '0 0 4px', fontWeight: 600}}>{n.periodStart} to {n.periodEnd}</p>\n                  <p style={S.muted}>{n.pods.length} PODs | {n.pods.reduce((s,p) => s + (p.pallets||0), 0)} pallets | {n.pods.reduce((s,p) => s + (p.totalUnits||0), 0).toFixed(2)} units</p>\n                  <p style={S.muted}>Driver: {n.driverName} | Farm: {n.farmDestination || 'N/A'}</p>"
new = """          {notes.length === 0 ? <p style={S.muted}>No collection notes yet.</p> : (
            <div>{notes.map(n => (
              <div key={n.noteId} style={S.noteCard}>
                <div style={{ marginBottom: 8 }}>
                  {n.collectionNoteNo && <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#2563eb', letterSpacing: 1 }}>COLL NOTE #{n.collectionNoteNo}</p>}
                  <p style={{margin: '0 0 4px', fontWeight: 600}}>{n.periodStart} to {n.periodEnd}</p>
                  <p style={S.muted}>{n.pods.length} PODs | {n.pods.reduce((s,p) => s + (p.pallets||0), 0)} pallets | {n.pods.reduce((s,p) => s + (p.totalUnits||0), 0).toFixed(2)} units</p>
                  <p style={S.muted}>Driver: {n.driverName} | Farm: {n.farmDestination || 'N/A'}</p>"""
assert content.count(old) == 1, "FAIL: history notes block"
content = content.replace(old, new, 1)
print("OK 5. History: collectionNoteNo badge + notes display updated")

# ── 6. Add Destruction Certs section to History view ─────────────────────
old = "      {/* \u2500\u2500\u2500 ADMIN: USERS \u2500\u2500\u2500 */}"
new = """
      {/* Destruction Certs in History */}
      {view === 'history' && certs.length > 0 && (
        <div style={S.card}>
          <h2 style={S.heading}>Destruction Certificates ({certs.length})</h2>
          {certs.map(c => (
            <div key={c.certId} style={{ ...S.noteCard, borderLeft: '4px solid #16a34a' }}>
              <div style={{ marginBottom: 8 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#16a34a', letterSpacing: 1 }}>DESTRUCTION CERTIFICATE</p>
                {c.collectionNoteNo && <p style={{ margin: '0 0 4px', fontWeight: 600 }}>Collection Note #{c.collectionNoteNo}</p>}
                <p style={S.muted}>Date: {c.destructionDate} | Weight: {c.weightDestroyed} kg | Weighbridge: {c.weighbridgeNo}</p>
                <p style={S.muted}>{c.tankerCount}x Tank — {c.itemsReceived}</p>
                <p style={S.muted}>Signed: {c.signerName}</p>
              </div>
              <button style={S.btnPrimary} onClick={() => downloadCertPdf(c.certId)}>Download Certificate PDF</button>
            </div>
          ))}
        </div>
      )}

      {/* \u2500\u2500\u2500 ADMIN: USERS \u2500\u2500\u2500 */}"""
assert content.count("      {/* \u2500\u2500\u2500 ADMIN: USERS \u2500\u2500\u2500 */}") == 1, "FAIL: admin users comment"
content = content.replace("      {/* \u2500\u2500\u2500 ADMIN: USERS \u2500\u2500\u2500 */}", new, 1)
print("OK 6. Destruction Certs section added to History")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("index.html saved. Length:", len(content))
