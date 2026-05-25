with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Insert FarmPortal component before PODTracker function
old = "function PODTracker() {"
new = """function FarmPortal({ user, onLogout }) {
  const [notes, setNotes] = useState([]);
  const [certs, setCerts] = useState([]);
  const [view, setView] = useState('notes');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const emptyCert = { collectionNoteNo: '', tankerCount: '', itemsReceived: '', destructionDate: new Date().toISOString().split('T')[0], weighbridgeNo: '', weightDestroyed: '', signerName: 'J.C.F. Beukes' };
  const [certForm, setCertForm] = useState(emptyCert);
  const [certSignature, setCertSignature] = useState(null);
  const certCanvasRef = useRef(null);
  const [certDrawing, setCertDrawing] = useState(false);

  useEffect(() => { loadNotes(); loadCerts(); }, []);

  const loadNotes = () => api('/api/farm/notes').then(r => r.json()).then(setNotes).catch(() => {});
  const loadCerts = () => api('/api/destruction-certs').then(r => r.json()).then(setCerts).catch(() => {});
  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(null), 4000); };

  const initCertCanvas = () => {
    setTimeout(() => {
      const c = certCanvasRef.current; if (!c) return;
      const ctx = c.getContext('2d');
      c.width = Math.min(c.parentElement.getBoundingClientRect().width - 4, 500);
      c.height = 150;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    }, 50);
  };
  const getCertPos = (e) => { const c = certCanvasRef.current; const rect = c.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return { x: t.clientX - rect.left, y: t.clientY - rect.top }; };
  const startCertDraw = (e) => { e.preventDefault(); setCertDrawing(true); const ctx = certCanvasRef.current.getContext('2d'); const p = getCertPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const doCertDraw = (e) => { if (!certDrawing) return; e.preventDefault(); const ctx = certCanvasRef.current.getContext('2d'); const p = getCertPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const stopCertDraw = () => { if (!certDrawing) return; setCertDrawing(false); setCertSignature(certCanvasRef.current.toDataURL('image/png')); };
  const clearCertSig = () => { const c = certCanvasRef.current; const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); setCertSignature(null); };

  const downloadCertPdf = (certId) => { const t = localStorage.getItem('pod_token'); window.open('/api/destruction-cert/' + certId + '/pdf?token=' + t, '_blank'); };

  const submitCert = async () => {
    if (!certForm.collectionNoteNo) { alert('Collection Note Number is required'); return; }
    if (!certForm.tankerCount) { alert('Number of tanker trucks is required'); return; }
    if (!certForm.itemsReceived) { alert('Items received is required'); return; }
    if (!certForm.destructionDate) { alert('Destruction date is required'); return; }
    if (!certForm.weighbridgeNo) { alert('Weighbridge number is required'); return; }
    if (!certForm.weightDestroyed) { alert('Weight destroyed is required'); return; }
    if (!certSignature) { alert('Signature is required'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.keys(certForm).forEach(k => fd.append(k, certForm[k]));
      fd.append('certSignature', certSignature);
      const res = await api('/api/destruction-cert', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Failed to save certificate');
      setCertForm(emptyCert);
      setCertSignature(null);
      await loadCerts();
      flash('Destruction Certificate saved! Email sent to Chill Beverages and Lucia.');
      setView('certs');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={S.container}>
      <header style={S.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={S.title}>Osdam Eco Facility Portal</h1>
            <p style={S.subtitle}>Farm destruction management</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 12, color: '#666', margin: '0 0 4px' }}>{user.username}</p>
            <button style={S.btnSm} onClick={onLogout}>Logout</button>
          </div>
        </div>
      </header>

      {error && <div style={S.errorBanner}>{error}<button style={S.closeBtn} onClick={() => setError(null)}>x</button></div>}
      {success && <div style={S.successBanner}>{success}</div>}

      <div style={S.nav}>
        <button style={view === 'notes' ? S.navActive : S.navBtn} onClick={() => setView('notes')}>Collection Notes</button>
        <button style={view === 'cert' ? S.navActive : S.navBtn} onClick={() => { setView('cert'); initCertCanvas(); }}>New Destruction Certificate</button>
        <button style={view === 'certs' ? S.navActive : S.navBtn} onClick={() => { setView('certs'); loadCerts(); }}>My Certificates</button>
      </div>

      {view === 'notes' && (
        <div style={S.card}>
          <h2 style={S.heading}>Collection Notes ({notes.length})</h2>
          {notes.length === 0 ? <p style={S.muted}>No collection notes found for your farm yet.</p> : (
            <div>{notes.map(n => (
              <div key={n.noteId} style={S.noteCard}>
                {n.collectionNoteNo && <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#2563eb' }}>COLL NOTE #{n.collectionNoteNo}</p>}
                <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{n.periodStart} to {n.periodEnd}</p>
                <p style={S.muted}>{n.pods.length} PODs | {n.pods.reduce((s,p) => s+(p.pallets||0),0)} pallets | {n.pods.reduce((s,p) => s+(p.totalUnits||0),0).toFixed(2)} units</p>
                <p style={S.muted}>Driver: {n.driverName} | Manifest: {n.manifestNumber}</p>
                <div style={{ marginTop: 10 }}>
                  <button style={S.btnPrimary} onClick={() => { const t = localStorage.getItem('pod_token'); window.open('/api/collection-note/' + n.noteId + '/pdf?token=' + t, '_blank'); }}>Download Collection Note PDF</button>
                </div>
              </div>
            ))}</div>
          )}
        </div>
      )}

      {view === 'cert' && (
        <div style={S.card}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #e5e7eb', paddingBottom: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2, color: '#1a1a1a' }}>OSDAM ECO FACILITY</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Patrysfontein, Durbanville</div>
            <div style={{ fontSize: 12, color: '#666' }}>Registration Number: 2014/166690/07</div>
            <div style={{ fontSize: 12, color: '#666' }}>VAT Number: 4070166139</div>
          </div>

          <h2 style={{ ...S.heading, textDecoration: 'underline', textAlign: 'center' }}>GOOD DESTRUCTION CERTIFICATE</h2>
          <p style={{ ...S.muted, textAlign: 'center', marginBottom: 20 }}>To Whom It May Concern</p>

          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 600, margin: 0 }}>Once saved, this certificate will automatically be emailed to Chill Beverages and Lucia with all supporting documents.</p>
          </div>

          <div style={S.grid2}>
            <div style={S.field}><label style={S.label}>Collection Note Number *</label><input style={S.input} placeholder="e.g. 64" value={certForm.collectionNoteNo} onChange={e => setCertForm({...certForm, collectionNoteNo: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Date of Destruction *</label><input style={S.input} type="date" value={certForm.destructionDate} onChange={e => setCertForm({...certForm, destructionDate: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Number of Tanker Trucks Received *</label><input style={S.input} type="number" min="1" placeholder="e.g. 1" value={certForm.tankerCount} onChange={e => setCertForm({...certForm, tankerCount: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Items / Product Received *</label><input style={S.input} placeholder="e.g. Cooldrink from Chill Beverages (PTY) LTD" value={certForm.itemsReceived} onChange={e => setCertForm({...certForm, itemsReceived: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Weighbridge Number *</label><input style={S.input} placeholder="e.g. 41867" value={certForm.weighbridgeNo} onChange={e => setCertForm({...certForm, weighbridgeNo: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Weight Destroyed (kg) *</label><input style={S.input} type="number" min="0" placeholder="e.g. 25040" value={certForm.weightDestroyed} onChange={e => setCertForm({...certForm, weightDestroyed: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Signed By</label><input style={S.input} value={certForm.signerName} onChange={e => setCertForm({...certForm, signerName: e.target.value})} /></div>
          </div>

          {(certForm.tankerCount || certForm.itemsReceived) && (
            <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 20, margin: '16px 0', backgroundColor: '#fafafa' }}>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: '#333', margin: 0 }}>
                I confirm Osdam Boerdery, Patrysfontein division, received <strong>{certForm.tankerCount || '__'}x Tank(s)</strong> of <strong>{certForm.itemsReceived || '__________'}</strong> on <strong>{certForm.destructionDate || '__________'}</strong>. It has been destroyed.
              </p>
              {certForm.collectionNoteNo && <p style={{ fontSize: 14, lineHeight: 1.8, color: '#333', margin: '6px 0 0' }}>Order No: <strong>{certForm.collectionNoteNo}</strong> Chill Coll Note</p>}
              {certForm.weighbridgeNo && <p style={{ fontSize: 14, lineHeight: 1.8, color: '#333', margin: '4px 0 0' }}>Patrysfontein: (Weighbridge NO: <strong>{certForm.weighbridgeNo}</strong>)</p>}
              {certForm.weightDestroyed && <p style={{ fontSize: 14, lineHeight: 1.8, color: '#333', margin: '4px 0 0' }}>Weight Destroyed: <strong>{certForm.weightDestroyed} kg</strong></p>}
            </div>
          )}

          <div style={S.divider}></div>
          <h3 style={S.sub}>Signature</h3>
          <p style={{ ...S.muted, marginBottom: 8 }}>Manager of Osdam Boerdery, Patrysfontein - sign below</p>
          <div style={{ border: '2px solid #d1d5db', borderRadius: 8, display: 'inline-block', touchAction: 'none' }}>
            <canvas ref={certCanvasRef} style={{ display: 'block', borderRadius: 6 }} onMouseDown={startCertDraw} onMouseMove={doCertDraw} onMouseUp={stopCertDraw} onMouseLeave={stopCertDraw} onTouchStart={startCertDraw} onTouchMove={doCertDraw} onTouchEnd={stopCertDraw} />
          </div>
          <div style={{ marginTop: 8 }}><button style={S.btnSm} onClick={clearCertSig}>Clear Signature</button></div>
          <div style={S.btnRow}>
            <button style={{ ...S.btnPrimary, opacity: loading ? 0.6 : 1 }} onClick={submitCert} disabled={loading}>{loading ? 'Saving...' : 'Save and Send Destruction Certificate'}</button>
            <button style={S.btnSec} onClick={() => setView('notes')}>Cancel</button>
          </div>
        </div>
      )}

      {view === 'certs' && (
        <div style={S.card}>
          <h2 style={S.heading}>My Destruction Certificates ({certs.length})</h2>
          {certs.length === 0 ? <p style={S.muted}>No certificates saved yet.</p> : (
            <div>{certs.map(c => (
              <div key={c.certId} style={{ ...S.noteCard, borderLeft: '4px solid #16a34a' }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#16a34a' }}>DESTRUCTION CERTIFICATE</p>
                {c.collectionNoteNo && <p style={{ margin: '0 0 4px', fontWeight: 600 }}>Collection Note #{c.collectionNoteNo}</p>}
                <p style={S.muted}>Date: {c.destructionDate} | Weight: {c.weightDestroyed} kg | Weighbridge: {c.weighbridgeNo}</p>
                <p style={S.muted}>{c.tankerCount}x Tank - {c.itemsReceived}</p>
                <p style={S.muted}>Signed: {c.signerName}</p>
                <div style={{ marginTop: 10 }}>
                  <button style={S.btnPrimary} onClick={() => downloadCertPdf(c.certId)}>Download Certificate PDF</button>
                </div>
              </div>
            ))}</div>
          )}
        </div>
      )}
    </div>
  );
}

function PODTracker() {"""
assert content.count(old) == 1, "FAIL: PODTracker anchor"
content = content.replace(old, new, 1)
print("OK: FarmPortal component added")

# ── Route farm users to FarmPortal ────────────────────────────────────────
old = "  if (!user) return <LoginPage onLogin={setUser} />;\n  return <MainApp user={user} onLogout={() => { localStorage.removeItem('pod_token'); localStorage.removeItem('pod_user'); setUser(null); }} />;"
new = "  if (!user) return <LoginPage onLogin={setUser} />;\n  const logout = () => { localStorage.removeItem('pod_token'); localStorage.removeItem('pod_user'); setUser(null); };\n  if (user.role === 'farm') return <FarmPortal user={user} onLogout={logout} />;\n  return <MainApp user={user} onLogout={logout} />;"
assert content.count(old) == 1, "FAIL: PODTracker routing"
content = content.replace(old, new, 1)
print("OK: farm users routed to FarmPortal")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Frontend saved. Lines:", content.count('\n'))
