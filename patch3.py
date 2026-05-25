with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Add nextNoteSeq state declaration (it was missing) ──────────────────
old = "  const [dupWarning, setDupWarning] = useState(null);"
new = "  const [nextNoteSeq, setNextNoteSeq] = useState(() => parseInt(localStorage.getItem('nextNoteSeq') || '64'));\n  const [nextCertSeq, setNextCertSeq] = useState(() => parseInt(localStorage.getItem('nextCertSeq') || '1'));\n  const [certForm, setCertForm] = useState({ collectionNoteNo: '', tankerCount: '', itemsReceived: '', destructionDate: new Date().toISOString().split('T')[0], weighbridgeNo: '', weightDestroyed: '', signerName: 'J.C.F. Beukes' });\n  const certCanvasRef = useRef(null);\n  const [certDrawing, setCertDrawing] = useState(false);\n  const [certSignature, setCertSignature] = useState(null);\n  const [dupWarning, setDupWarning] = useState(null);"
assert content.count(old) == 1, "FAIL step 1: dupWarning not found"
content = content.replace(old, new, 1)
print("OK 1. nextNoteSeq + certForm state added")

# ── 2. Add cert canvas helpers after clearSig ──────────────────────────────
old = "  const clearSig = () => { const c = canvasRef.current; const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); setSignature(null); };"
new = """  const clearSig = () => { const c = canvasRef.current; const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); setSignature(null); };

  const initCertCanvas = () => {
    setTimeout(() => {
      const c = certCanvasRef.current;
      if (!c) return;
      const ctx = c.getContext('2d');
      const rect = c.parentElement.getBoundingClientRect();
      c.width = Math.min(rect.width - 4, 500);
      c.height = 150;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }, 50);
  };
  const getCertPos = (e) => { const c = certCanvasRef.current; const rect = c.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return { x: t.clientX - rect.left, y: t.clientY - rect.top }; };
  const startCertDraw = (e) => { e.preventDefault(); setCertDrawing(true); const ctx = certCanvasRef.current.getContext('2d'); const p = getCertPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const doCertDraw = (e) => { if (!certDrawing) return; e.preventDefault(); const ctx = certCanvasRef.current.getContext('2d'); const p = getCertPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const stopCertDraw = () => { if (!certDrawing) return; setCertDrawing(false); setCertSignature(certCanvasRef.current.toDataURL('image/png')); };
  const clearCertSig = () => { const c = certCanvasRef.current; const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); setCertSignature(null); };

  const submitCert = async () => {
    if (!certForm.collectionNoteNo) { alert('Collection Note Number is required'); return; }
    if (!certForm.tankerCount) { alert('Number of tanker trucks is required'); return; }
    if (!certForm.itemsReceived) { alert('Items received description is required'); return; }
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
      const newCertSeq = nextCertSeq + 1;
      setNextCertSeq(newCertSeq);
      localStorage.setItem('nextCertSeq', newCertSeq.toString());
      setCertForm({ collectionNoteNo: '', tankerCount: '', itemsReceived: '', destructionDate: new Date().toISOString().split('T')[0], weighbridgeNo: '', weightDestroyed: '', signerName: 'J.C.F. Beukes' });
      setCertSignature(null);
      flash('Destruction Certificate saved!');
      setView('history');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const downloadCertPdf = (certId) => {
    const token = localStorage.getItem('pod_token');
    window.open('/api/destruction-cert/' + certId + '/pdf?token=' + token, '_blank');
  };"""
assert content.count(old) == 1, "FAIL step 2: clearSig not found"
content = content.replace(old, new, 1)
print("OK 2. Cert canvas helpers + submitCert added")

# ── 3. Add Destruction Certificate nav tab ─────────────────────────────────
old = "        <button style={view === 'history' ? S.navActive : S.navBtn} onClick={() => setView('history')}>History</button>"
new = "        <button style={view === 'history' ? S.navActive : S.navBtn} onClick={() => setView('history')}>History</button>\n        <button style={view === 'cert' ? S.navActive : S.navBtn} onClick={() => { setView('cert'); initCertCanvas(); }}>Destroy Cert</button>"
assert content.count(old) == 1, "FAIL step 3: history nav not found"
content = content.replace(old, new, 1)
print("OK 3. Destruction Certificate nav tab added")

# ── 4. Insert Destruction Certificate VIEW before HISTORY view ─────────────
old = "      {/* \u2500\u2500\u2500 HISTORY \u2500\u2500\u2500 */}"
new = """      {/* \u2500\u2500\u2500 DESTRUCTION CERTIFICATE \u2500\u2500\u2500 */}
      {view === 'cert' && (
        <div style={S.card}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #e5e7eb', paddingBottom: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 4 }}>🌿</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2, color: '#1a1a1a' }}>OSDAM ECO FACILITY</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>Patrysfontein, Durbanville</div>
            <div style={{ fontSize: 12, color: '#666' }}>Registration Number: 2014/166690/07</div>
            <div style={{ fontSize: 12, color: '#666' }}>VAT Number: 4070166139</div>
          </div>

          <h2 style={{ ...S.heading, textDecoration: 'underline', textAlign: 'center', fontSize: 18 }}>GOOD DESTRUCTION CERTIFICATE</h2>
          <p style={{ ...S.muted, marginBottom: 20, textAlign: 'center' }}>To Whom It May Concern</p>

          <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: '#0369a1', fontWeight: 600, margin: 0 }}>Collection Note # shown at top of certificate is auto-generated when a POD is logged. Enter it below to link this certificate to a collection note.</p>
          </div>

          <div style={S.grid2}>
            <div style={S.field}><label style={S.label}>Collection Note Number *</label><input style={S.input} placeholder="e.g. 64" value={certForm.collectionNoteNo} onChange={e => setCertForm({...certForm, collectionNoteNo: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Date of Destruction *</label><input style={S.input} type="date" value={certForm.destructionDate} onChange={e => setCertForm({...certForm, destructionDate: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Number of Tanker Trucks Received *</label><input style={S.input} type="number" min="1" placeholder="e.g. 1" value={certForm.tankerCount} onChange={e => setCertForm({...certForm, tankerCount: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Items / Product Received *</label><input style={S.input} placeholder="e.g. Cooldrink from Chill Beverages (PTY) LTD" value={certForm.itemsReceived} onChange={e => setCertForm({...certForm, itemsReceived: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Weighbridge Number *</label><input style={S.input} placeholder="e.g. 41867" value={certForm.weighbridgeNo} onChange={e => setCertForm({...certForm, weighbridgeNo: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Weight Destroyed (kg) *</label><input style={S.input} type="number" min="0" placeholder="e.g. 25040" value={certForm.weightDestroyed} onChange={e => setCertForm({...certForm, weightDestroyed: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Signed By</label><input style={S.input} placeholder="Full name" value={certForm.signerName} onChange={e => setCertForm({...certForm, signerName: e.target.value})} /></div>
          </div>

          {certForm.tankerCount && certForm.itemsReceived && certForm.destructionDate && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, margin: '20px 0', backgroundColor: '#fafafa' }}>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: '#333', margin: 0 }}>
                I confirm Osdam Boerdery, Patrysfontein division, received <strong>{certForm.tankerCount}x Tank{certForm.tankerCount > 1 ? 's' : ''}</strong> of <strong>{certForm.itemsReceived}</strong> on <strong>{certForm.destructionDate}</strong>. It has been destroyed.
              </p>
              {certForm.collectionNoteNo && <p style={{ fontSize: 14, lineHeight: 1.8, color: '#333', margin: '8px 0 0' }}>Order No: <strong>{certForm.collectionNoteNo}</strong> Chill Coll Note</p>}
              {certForm.weighbridgeNo && <p style={{ fontSize: 14, lineHeight: 1.8, color: '#333', margin: '4px 0 0' }}>Patrysfontein: (Weighbridge NO: <strong>{certForm.weighbridgeNo}</strong>)</p>}
              {certForm.weightDestroyed && <p style={{ fontSize: 14, lineHeight: 1.8, color: '#333', margin: '4px 0 0' }}>Weight Destroyed: <strong>{certForm.weightDestroyed} kg</strong></p>}
            </div>
          )}

          <div style={S.divider}></div>
          <h3 style={S.sub}>Signature</h3>
          <p style={{ ...S.muted, marginBottom: 8 }}>Manager of Osdam Boerdery, Patrysfontein — sign below</p>
          <div style={{ border: '2px solid #d1d5db', borderRadius: 8, display: 'inline-block', touchAction: 'none' }}>
            <canvas ref={certCanvasRef} style={{ display: 'block', borderRadius: 6 }}
              onMouseDown={startCertDraw} onMouseMove={doCertDraw} onMouseUp={stopCertDraw} onMouseLeave={stopCertDraw}
              onTouchStart={startCertDraw} onTouchMove={doCertDraw} onTouchEnd={stopCertDraw} />
          </div>
          <div style={{ marginTop: 8 }}><button style={S.btnSm} onClick={clearCertSig}>Clear Signature</button></div>

          <div style={S.btnRow}>
            <button style={{ ...S.btnPrimary, opacity: loading ? 0.6 : 1 }} onClick={submitCert} disabled={loading}>{loading ? 'Saving...' : 'Save Destruction Certificate'}</button>
            <button style={S.btnSec} onClick={() => setView('dashboard')}>Cancel</button>
          </div>
        </div>
      )}

      {/* \u2500\u2500\u2500 HISTORY \u2500\u2500\u2500 */}"""
assert content.count("      {/* \u2500\u2500\u2500 HISTORY \u2500\u2500\u2500 */}") == 1, "FAIL step 4: history comment not found"
content = content.replace("      {/* \u2500\u2500\u2500 HISTORY \u2500\u2500\u2500 */}", new, 1)
print("OK 4. Destruction Certificate view inserted")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("File saved. Length:", len(content))
