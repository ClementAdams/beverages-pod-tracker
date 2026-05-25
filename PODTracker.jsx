const { useState, useEffect, useRef } = React;

function PODTracker() {
  const [view, setView] = useState('dashboard');
  const [pods, setPods] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // POD form
  const [podForm, setPodForm] = useState({ gtr: '', sct: '', dateShipped: '', receivedDate: new Date().toISOString().split('T')[0], receivedBy: '', pallets: '', totalUnits: '' });
  const [podPhoto, setPodPhoto] = useState(null);
  const fileRef = useRef(null);

  // Collection note form
  const [selectedPodIds, setSelectedPodIds] = useState([]);
  const [noteForm, setNoteForm] = useState({ driverName: '', vehicleInfo: '', farmDestination: '', accountantEmail: '', periodStart: '', periodEnd: '', manifestNumber: '', collectionNoteNo: '', farmName: '' });
  const [manifestPhoto, setManifestPhoto] = useState(null);
  const manifestFileRef = useRef(null);
  const [wasteManifestPhoto, setWasteManifestPhoto] = useState(null); // NEW: Photo for waste manifest
  const [wastePhotoPreview, setWastePhotoPreview] = useState(null); // NEW: Preview
  const wastePhotoRef = useRef(null); // NEW: Ref for file input
  const [signature, setSignature] = useState(null);
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => { loadPods(); loadNotes(); }, []);

  const loadPods = () => fetch('/api/pods').then(r => r.json()).then(setPods).catch(() => {});
  const loadNotes = () => fetch('/api/collection-notes').then(r => r.json()).then(setNotes).catch(() => {});

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(null), 4000); };

  // ─── Log POD ────────────────────────────────────────────────

  const submitPod = async () => {
    if (!podForm.gtr || !podForm.sct) { alert('GTR and SCT are required'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.keys(podForm).forEach(k => fd.append(k, podForm[k]));
      if (podPhoto) fd.append('photo', podPhoto);
      const res = await fetch('/api/pod', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Failed');
      setPodForm({ gtr: '', sct: '', dateShipped: '', receivedDate: new Date().toISOString().split('T')[0], receivedBy: '', pallets: '', totalUnits: '' });
      setPodPhoto(null);
      if (fileRef.current) fileRef.current.value = '';
      await loadPods();
      flash('POD logged successfully');
      setView('dashboard');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const deletePod = async (podId) => {
    if (!confirm('Delete this POD?')) return;
    await fetch(`/api/pod/${podId}`, { method: 'DELETE' });
    loadPods();
  };

  // ─── Signature Pad ─────────────────────────────────────────

  const initCanvas = () => {
    setTimeout(() => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext('2d');
      const rect = c.parentElement.getBoundingClientRect();
      c.width = Math.min(rect.width - 4, 500);
      c.height = 180;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }, 50);
  };

  const getPos = (e) => {
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const stopDraw = () => {
    if (!drawing) return;
    setDrawing(false);
    setSignature(canvasRef.current.toDataURL('image/png'));
  };

  const clearSig = () => {
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    setSignature(null);
  };

  // NEW: Handle waste manifest photo capture
  const handleWastePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Photo must be less than 10MB');
        return;
      }
      setWasteManifestPhoto(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setWastePhotoPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // NEW: Remove waste manifest photo
  const removeWastePhoto = () => {
    setWasteManifestPhoto(null);
    setWastePhotoPreview(null);
    if (wastePhotoRef.current) wastePhotoRef.current.value = '';
  };

  // NEW: Retry send for failed delivery notes
  const handleRetrySend = async (noteId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/collection-note/${noteId}/retry-send`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to retry send');
      flash(`${data.message} (Attempt #${data.attempts})`);
      await loadNotes();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Create Collection Note ─────────────────────────────────

  const togglePod = (podId) => {
    setSelectedPodIds(prev => prev.includes(podId) ? prev.filter(id => id !== podId) : [...prev, podId]);
  };

  const selectAll = () => {
    if (selectedPodIds.length === pods.length) setSelectedPodIds([]);
    else setSelectedPodIds(pods.map(p => p.podId));
  };

  const submitNote = async () => {
    if (selectedPodIds.length === 0) { alert('Select at least one POD'); return; }
    if (!signature) { alert('Driver signature is required'); return; }
    if (!noteForm.driverName) { alert('Driver name is required'); return; }
    if (!noteForm.manifestNumber) { alert('Manifest number is required'); return; }
    if (!manifestPhoto) { alert('Manifest photo is required'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('driverName', noteForm.driverName);
      fd.append('vehicleInfo', noteForm.vehicleInfo);
      fd.append('farmDestination', noteForm.farmDestination);
      fd.append('accountantEmail', noteForm.accountantEmail);
      fd.append('periodStart', noteForm.periodStart);
      fd.append('periodEnd', noteForm.periodEnd);
      fd.append('manifestNumber', noteForm.manifestNumber);
      fd.append('collectionNoteNo', noteForm.collectionNoteNo);
      fd.append('farmName', noteForm.farmName);
      fd.append('podIds', JSON.stringify(selectedPodIds));
      fd.append('driverSignature', signature);
      fd.append('manifestPhoto', manifestPhoto);
      // NEW: Add waste manifest photo if selected
      if (wasteManifestPhoto) {
        fd.append('wasteManifestPhoto', wasteManifestPhoto);
      }

      const res = await fetch('/api/collection-note', {
        method: 'POST',
        body: fd
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      // NEW: Show delivery note number in success message
      const deliveryNum = data.deliveryNoteNumber ? ` - Delivery Note #${data.deliveryNoteNumber}` : '';
      flash(`Collection Note created & emailed${deliveryNum}`);
      setSelectedPodIds([]);
      setNoteForm({ driverName: '', vehicleInfo: '', farmDestination: '', accountantEmail: '', periodStart: '', periodEnd: '', manifestNumber: '', collectionNoteNo: '', farmName: '' });
      setManifestPhoto(null);
      setWasteManifestPhoto(null); // NEW: Reset waste photo
      setWastePhotoPreview(null); // NEW: Clear preview
      if (manifestFileRef.current) manifestFileRef.current.value = '';
      if (wastePhotoRef.current) wastePhotoRef.current.value = ''; // NEW: Clear waste photo input
      setSignature(null);
      await loadNotes();
      setView('dashboard');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div style={S.container}>
      <header style={S.header}>
        <h1 style={S.title}>Beverage POD Tracker</h1>
        <p style={S.subtitle}>Collection note management</p>
      </header>

      {error && <div style={S.errorBanner}>{error}<button style={S.closeBtn} onClick={() => setError(null)}>✕</button></div>}
      {success && <div style={S.successBanner}>{success}</div>}

      {/* NAV */}
      <div style={S.nav}>
        <button style={view === 'dashboard' ? S.navActive : S.navBtn} onClick={() => setView('dashboard')}>Dashboard</button>
        <button style={view === 'logpod' ? S.navActive : S.navBtn} onClick={() => setView('logpod')}>Log POD</button>
        <button style={view === 'create' ? S.navActive : S.navBtn} onClick={() => { setView('create'); initCanvas(); }}>Create Collection Note</button>
        <button style={view === 'history' ? S.navActive : S.navBtn} onClick={() => setView('history')}>History</button>
      </div>

      {/* DASHBOARD */}
      {view === 'dashboard' && (
        <div style={S.card}>
          <div style={S.row}>
            <h2 style={S.heading}>Logged PODs ({pods.length})</h2>
            <button style={S.btnSm} onClick={loadPods}>Refresh</button>
          </div>
          {pods.length === 0 ? <p style={S.muted}>No PODs logged yet. Tap "Log POD" to start.</p> : (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead><tr style={S.thead}>
                  <th style={S.th}>GTR</th><th style={S.th}>SCT</th><th style={S.th}>Shipped</th>
                  <th style={S.th}>Received</th><th style={S.th}>By</th><th style={S.th}>Pallets</th>
                  <th style={S.th}>Units</th><th style={S.th}>Photo</th><th style={S.th}></th>
                </tr></thead>
                <tbody>{pods.map(p => (
                  <tr key={p.podId} style={S.tr}>
                    <td style={S.td}>{p.gtr}</td><td style={S.td}>{p.sct}</td>
                    <td style={S.td}>{p.dateShipped}</td><td style={S.td}>{p.receivedDate}</td>
                    <td style={S.td}>{p.receivedBy}</td><td style={S.td}>{p.pallets}</td>
                    <td style={S.td}>{p.totalUnits}</td>
                    <td style={S.td}>{p.photo ? '📷' : '—'}</td>
                    <td style={S.td}><button style={S.btnDel} onClick={() => deletePod(p.podId)}>✕</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* LOG POD */}
      {view === 'logpod' && (
        <div style={S.card}>
          <h2 style={S.heading}>Log Received POD</h2>
          <div style={S.grid2}>
            <div style={S.field}><label style={S.label}>GTR Reference *</label>
              <input style={S.input} placeholder="e.g. DM0101423" value={podForm.gtr} onChange={e => setPodForm({...podForm, gtr: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>SCT Number *</label>
              <input style={S.input} placeholder="e.g. 521406" value={podForm.sct} onChange={e => setPodForm({...podForm, sct: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Date Shipped</label>
              <input style={S.input} type="date" value={podForm.dateShipped} onChange={e => setPodForm({...podForm, dateShipped: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Date Received</label>
              <input style={S.input} type="date" value={podForm.receivedDate} onChange={e => setPodForm({...podForm, receivedDate: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Received By</label>
              <input style={S.input} placeholder="Person who received" value={podForm.receivedBy} onChange={e => setPodForm({...podForm, receivedBy: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Pallets</label>
              <input style={S.input} type="number" min="0" value={podForm.pallets} onChange={e => setPodForm({...podForm, pallets: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Total Units</label>
              <input style={S.input} type="number" step="0.01" min="0" value={podForm.totalUnits} onChange={e => setPodForm({...podForm, totalUnits: e.target.value})} /></div>
          </div>

          <div style={{...S.field, marginTop: 16}}>
            <label style={S.label}>Photo of POD Document</label>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={S.input}
              onChange={e => setPodPhoto(e.target.files[0] || null)} />
            {podPhoto && <p style={{...S.muted, marginTop: 4}}>Selected: {podPhoto.name}</p>}
          </div>

          <div style={S.btnRow}>
            <button style={{...S.btnPrimary, opacity: loading ? 0.6 : 1}} onClick={submitPod} disabled={loading}>
              {loading ? 'Saving...' : 'Save POD'}
            </button>
            <button style={S.btnSec} onClick={() => setView('dashboard')}>Cancel</button>
          </div>
        </div>
      )}

      {/* CREATE COLLECTION NOTE */}
      {view === 'create' && (
        <div style={S.card}>
          <h2 style={S.heading}>Create Collection Note</h2>

          <h3 style={S.sub}>1. Select PODs to include</h3>
          {pods.length === 0 ? <p style={S.muted}>No PODs logged. Log some PODs first.</p> : (
            <div>
              <button style={S.btnSm} onClick={selectAll}>
                {selectedPodIds.length === pods.length ? 'Deselect All' : 'Select All'}
              </button>
              <div style={{...S.tableWrap, marginTop: 8}}>
                <table style={S.table}>
                  <thead><tr style={S.thead}>
                    <th style={S.th}>✓</th><th style={S.th}>GTR</th><th style={S.th}>SCT</th>
                    <th style={S.th}>Shipped</th><th style={S.th}>Received</th><th style={S.th}>Pallets</th><th style={S.th}>Units</th>
                  </tr></thead>
                  <tbody>{pods.map(p => (
                    <tr key={p.podId} style={{...S.tr, backgroundColor: selectedPodIds.includes(p.podId) ? '#dbeafe' : '#fff', cursor: 'pointer'}} onClick={() => togglePod(p.podId)}>
                      <td style={S.td}><input type="checkbox" checked={selectedPodIds.includes(p.podId)} readOnly /></td>
                      <td style={S.td}>{p.gtr}</td><td style={S.td}>{p.sct}</td>
                      <td style={S.td}>{p.dateShipped}</td><td style={S.td}>{p.receivedDate}</td>
                      <td style={S.td}>{p.pallets}</td><td style={S.td}>{p.totalUnits}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              {selectedPodIds.length > 0 && (
                <div style={S.totalsBox}>
                  <strong>Selected: </strong>{selectedPodIds.length} PODs | {' '}
                  {pods.filter(p => selectedPodIds.includes(p.podId)).reduce((s,p) => s + (p.pallets||0), 0)} pallets | {' '}
                  {pods.filter(p => selectedPodIds.includes(p.podId)).reduce((s,p) => s + (p.totalUnits||0), 0).toFixed(2)} units
                </div>
              )}
            </div>
          )}

          <div style={S.divider}></div>
          <h3 style={S.sub}>2. Collection Details</h3>
          <div style={S.grid2}>
            <div style={S.field}><label style={S.label}>Period Start</label>
              <input style={S.input} type="date" value={noteForm.periodStart} onChange={e => setNoteForm({...noteForm, periodStart: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Period End</label>
              <input style={S.input} type="date" value={noteForm.periodEnd} onChange={e => setNoteForm({...noteForm, periodEnd: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Driver Name *</label>
              <input style={S.input} placeholder="Driver name" value={noteForm.driverName} onChange={e => setNoteForm({...noteForm, driverName: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Vehicle Info</label>
              <input style={S.input} placeholder="License plate" value={noteForm.vehicleInfo} onChange={e => setNoteForm({...noteForm, vehicleInfo: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Farm / Destination</label>
              <input style={S.input} placeholder="Farm name" value={noteForm.farmDestination} onChange={e => setNoteForm({...noteForm, farmDestination: e.target.value})} /></div>
            <div style={S.field}><label style={S.label}>Accountant Email</label>
              <input style={S.input} type="email" placeholder="accountant@email.com" value={noteForm.accountantEmail} onChange={e => setNoteForm({...noteForm, accountantEmail: e.target.value})} /></div>
          </div>

          <div style={S.divider}></div>
          <h3 style={S.sub}>3. Waste Collection Manifest</h3>
          <div style={S.grid2}>
            <div style={S.field}><label style={S.label}>Manifest Number *</label>
              <input style={S.input} placeholder="e.g. WCM-2024-001" value={noteForm.manifestNumber} onChange={e => setNoteForm({...noteForm, manifestNumber: e.target.value})} /></div>
          </div>
          <div style={{...S.field, marginTop: 16}}>
            <label style={S.label}>Manifest Photo *</label>
            <input ref={manifestFileRef} type="file" accept="image/*" capture="environment" style={S.input}
              onChange={e => setManifestPhoto(e.target.files[0] || null)} />
            {manifestPhoto && <p style={{...S.muted, marginTop: 4}}>Selected: {manifestPhoto.name}</p>}
          </div>

          {/* NEW: Waste Manifest Photo Section */}
          <div style={{...S.field, marginTop: 16, padding: 16, backgroundColor: '#f0f9ff', borderRadius: 8, border: '2px dashed #0284c7'}}>
            <label style={S.label}>📷 Waste Manifest Photo (Capacity / Condition Photo)</label>
            <p style={{...S.muted, marginTop: 8}}>Optional: Upload a photo showing waste manifest, capacity, or condition</p>
            <input ref={wastePhotoRef} type="file" accept="image/*" capture="environment" style={S.input}
              onChange={handleWastePhotoCapture} />
            {wasteManifestPhoto && (
              <div style={{marginTop: 12}}>
                <p style={{...S.muted, marginBottom: 8}}>📁 Selected: {wasteManifestPhoto.name}</p>
                {wastePhotoPreview && (
                  <div style={{marginTop: 12}}>
                    <img src={wastePhotoPreview} alt="Waste manifest preview" style={{maxWidth: '100%', maxHeight: 200, borderRadius: 6, border: '1px solid #ddd'}} />
                    <div style={{marginTop: 8}}>
                      <button style={{...S.btnSm, backgroundColor: '#dc2626', color: 'white'}} onClick={removeWastePhoto}>
                        ✕ Remove Photo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={S.divider}></div>
          <h3 style={S.sub}>4. Driver Signature</h3>
          <p style={S.muted}>Sign below with your finger or mouse</p>
          <div style={{border: '2px solid #d1d5db', borderRadius: 8, display: 'inline-block', touchAction: 'none'}}>
            <canvas ref={canvasRef} style={{display: 'block', borderRadius: 6}}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
          </div>
          <div style={{marginTop: 8}}>
            <button style={S.btnSm} onClick={clearSig}>Clear Signature</button>
          </div>

          <div style={S.btnRow}>
            <button style={{...S.btnPrimary, opacity: loading ? 0.6 : 1}} onClick={submitNote} disabled={loading}>
              {loading ? 'Creating...' : 'Create Collection Note & Email'}
            </button>
            <button style={S.btnSec} onClick={() => setView('dashboard')}>Cancel</button>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {view === 'history' && (
        <div style={S.card}>
          <div style={S.row}>
            <h2 style={S.heading}>Collection Note History</h2>
            <button style={S.btnSm} onClick={loadNotes}>Refresh</button>
          </div>
          {notes.length === 0 ? <p style={S.muted}>No collection notes yet.</p> : (
            <div>{notes.map(n => (
              <div key={n.noteId} style={S.noteCard}>
                <div style={S.row}>
                  <div>
                    {/* NEW: Show delivery note number */}
                    {n.deliveryNoteNumber && (
                      <p style={{margin: '0 0 4px', fontWeight: 700, color: '#2563eb', fontSize: 14}}>
                        Delivery Note #{n.deliveryNoteNumber}
                      </p>
                    )}
                    <p style={{margin: '0 0 4px', fontWeight: 600}}>
                      {n.periodStart} to {n.periodEnd}
                    </p>
                    <p style={S.muted}>
                      {n.pods.length} PODs | Driver: {n.driverName} | Farm: {n.farmDestination || 'N/A'}
                    </p>
                    {/* NEW: Show send status and attempts */}
                    {n.sendStatus && (
                      <p style={{margin: '8px 0 4px', fontSize: 12, fontWeight: 600, color: n.sendStatus === 'sent' ? '#16a34a' : n.sendStatus === 'failed' ? '#dc2626' : '#ea580c'}}>
                        Status: {n.sendStatus.toUpperCase()}
                        {n.sendAttempts > 0 && ` (Attempt #${n.sendAttempts})`}
                      </p>
                    )}
                    {/* NEW: Show error if send failed */}
                    {n.lastSendError && (
                      <p style={{margin: '8px 0 4px', fontSize: 12, color: '#dc2626', backgroundColor: '#fee2e2', padding: '6px 8px', borderRadius: 4}}>
                        ⚠️ {n.lastSendError}
                      </p>
                    )}
                    {/* NEW: Show photo indicator */}
                    {n.wasteManifestPhoto && (
                      <p style={{margin: '4px 0 0', fontSize: 12, color: '#0284c7'}}>
                        📷 Waste photo attached
                      </p>
                    )}
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                    <button style={S.btnPrimary} onClick={() => window.open(`/api/collection-note/${n.noteId}/pdf`, '_blank')}>
                      Download PDF
                    </button>
                    {/* NEW: Retry button for failed sends */}
                    {n.sendStatus === 'failed' && (
                      <button style={{...S.btnPrimary, backgroundColor: '#ea580c'}} onClick={() => handleRetrySend(n.noteId)} disabled={loading}>
                        {loading ? '⏳ Retrying...' : '🔄 Retry Send'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────

const S = {
  container: { maxWidth: 1000, margin: '0 auto', padding: 16, fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', backgroundColor: '#f5f7fa', minHeight: '100vh' },
  header: { backgroundColor: '#fff', padding: '24px 20px', borderRadius: 12, marginBottom: 16, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', textAlign: 'center' },
  title: { margin: '0 0 4px', fontSize: 26, color: '#1a1a1a', fontWeight: 700 },
  subtitle: { margin: 0, fontSize: 13, color: '#666' },
  nav: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  navBtn: { flex: 1, minWidth: 120, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, backgroundColor: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#333' },
  navActive: { flex: 1, minWidth: 120, padding: '10px 12px', border: '2px solid #2563eb', borderRadius: 8, backgroundColor: '#eff6ff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#2563eb' },
  card: { backgroundColor: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 16 },
  heading: { fontSize: 20, margin: '0 0 16px', color: '#1a1a1a', fontWeight: 600 },
  sub: { fontSize: 15, margin: '20px 0 12px', color: '#333', fontWeight: 600 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  field: { marginBottom: 8 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#555' },
  input: { width: '100%', padding: '9px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' },
  btnPrimary: { backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '11px 22px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  btnSec: { backgroundColor: '#e5e7eb', color: '#333', border: 'none', padding: '11px 22px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  btnSm: { backgroundColor: '#f3f4f6', color: '#333', border: '1px solid #d1d5db', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  btnDel: { backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700 },
  btnRow: { display: 'flex', gap: 10, marginTop: 24 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  thead: { backgroundColor: '#f3f4f6' },
  th: { padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#333', borderBottom: '2px solid #e5e7eb' },
  tr: { borderBottom: '1px solid #e5e7eb' },
  td: { padding: '10px 8px', color: '#555' },
  muted: { color: '#999', fontSize: 13, margin: 0 },
  divider: { height: 1, backgroundColor: '#e5e7eb', margin: '20px 0' },
  totalsBox: { backgroundColor: '#f0f9ff', padding: '10px 14px', borderRadius: 6, borderLeft: '4px solid #2563eb', marginTop: 10, fontSize: 13, fontWeight: 500 },
  noteCard: { border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 10 },
  errorBanner: { backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 },
  successBanner: { backgroundColor: '#dcfce7', color: '#166534', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 500 },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit' }
};
