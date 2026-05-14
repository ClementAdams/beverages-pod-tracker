const { useState, useEffect } = React;

const API = '';

function PODTracker() {
  const [currentStep, setCurrentStep] = useState('dashboard');
  const [pods, setPods] = useState([]);
  const [selectedPod, setSelectedPod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    gtr: '',
    sct: '',
    dateShipped: '',
    items: [],
    driverName: '',
    vehicleInfo: '',
    farmDestination: '',
    accountantEmail: '',
    clientEmail: ''
  });
  const [ubcCans, setUbcCans] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    itemCode: '',
    description: '',
    volumeMl: 500,
    quantity: 0,
    pallets: 0
  });
  const [totals, setTotals] = useState({ qty: 0, litres: 0 });

  useEffect(() => {
    loadPods();
    fetch(`${API}/api/ubc-cans`)
      .then(r => r.json())
      .then(setUbcCans)
      .catch(() => setUbcCans([
        { ml: 500, label: '500ml' }, { ml: 473, label: '473ml (US)' },
        { ml: 440, label: '440ml' }, { ml: 375, label: '375ml' },
        { ml: 355, label: '355ml' }, { ml: 330, label: '330ml' },
        { ml: 250, label: '250ml' }, { ml: 200, label: '200ml' }
      ]));
  }, []);

  const loadPods = async () => {
    try {
      const res = await fetch(`${API}/api/pods`);
      const data = await res.json();
      setPods(data);
    } catch {
      setError('Could not load PODs from server.');
    }
  };

  const calculateTotals = (items) => {
    let qty = 0, litres = 0;
    items.forEach(item => {
      qty += item.quantity;
      litres += (item.quantity * item.volumeMl) / 1000;
    });
    setTotals({ qty, litres: Math.round(litres * 100) / 100 });
  };

  const addItem = () => {
    if (!currentItem.itemCode || !currentItem.description || currentItem.quantity === 0) {
      alert('Please fill all item fields');
      return;
    }
    const newItems = [...formData.items, { ...currentItem }];
    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems);
    setCurrentItem({ itemCode: '', description: '', volumeMl: 500, quantity: 0, pallets: 0 });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems);
  };

  const resetForm = () => {
    setFormData({ gtr: '', sct: '', dateShipped: '', items: [], driverName: '', vehicleInfo: '', farmDestination: '', accountantEmail: '', clientEmail: '' });
    setCurrentItem({ itemCode: '', description: '', volumeMl: 500, quantity: 0, pallets: 0 });
    setTotals({ qty: 0, litres: 0 });
  };

  const createPOD = async () => {
    if (!formData.gtr || !formData.sct || formData.items.length === 0) {
      alert('Please complete all required fields and add at least one item');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('gtr', formData.gtr);
      body.append('sct', formData.sct);
      body.append('dateShipped', formData.dateShipped);
      body.append('items', JSON.stringify(formData.items));

      const res = await fetch(`${API}/api/pod/scan`, { method: 'POST', body });
      if (!res.ok) throw new Error('Failed to create POD');

      const { podId } = await res.json();

      await fetch(`${API}/api/collection-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          podId,
          driverName: formData.driverName,
          vehicleInfo: formData.vehicleInfo,
          farmDestination: formData.farmDestination,
          accountantEmail: formData.accountantEmail,
          clientEmail: formData.clientEmail
        })
      });

      resetForm();
      setCurrentStep('dashboard');
      await loadPods();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const viewPod = async (podId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/pod/${podId}`);
      const pod = await res.json();
      setSelectedPod(pod);
      setCurrentStep('details');
    } catch {
      setError('Could not load POD details.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (noteId) => {
    if (!noteId) { alert('No collection note found for this POD.'); return; }
    window.open(`${API}/api/collection-note/${noteId}/pdf`, '_blank');
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Beverage POD Tracker</h1>
        <p style={styles.subtitle}>Warehouse supply chain management</p>
      </header>

      {error && (
        <div style={styles.errorBanner}>
          {error}
          <button style={styles.errorClose} onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {currentStep === 'dashboard' && (
        <div style={styles.section}>
          <div style={styles.actionBar}>
            <button style={styles.buttonPrimary} onClick={() => setCurrentStep('scan')}>
              + New POD
            </button>
            <button style={styles.buttonSecondary} onClick={loadPods}>
              Refresh
            </button>
          </div>

          {pods.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No PODs yet. Create your first one!</p>
            </div>
          ) : (
            <div style={styles.podList}>
              <table style={styles.table}>
                <thead style={styles.thead}>
                  <tr>
                    <th style={styles.th}>GTR</th>
                    <th style={styles.th}>SCT</th>
                    <th style={styles.th}>Date Received</th>
                    <th style={styles.th}>Units</th>
                    <th style={styles.th}>Litres</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pods.map(pod => (
                    <tr key={pod.podId} style={styles.tr}>
                      <td style={styles.td}>{pod.gtr}</td>
                      <td style={styles.td}>{pod.sct}</td>
                      <td style={styles.td}>{pod.receivedDate}</td>
                      <td style={styles.td}>{pod.totalQuantity}</td>
                      <td style={styles.td}>{pod.totalLitres}L</td>
                      <td style={styles.td}><span style={styles.badge}>{pod.status}</span></td>
                      <td style={styles.td}>
                        <button style={styles.buttonSmall} onClick={() => viewPod(pod.podId)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {currentStep === 'scan' && (
        <div style={styles.section}>
          <h2 style={styles.heading}>New POD Entry</h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>GTR Reference Number *</label>
            <input type="text" placeholder="e.g., DM0101423" value={formData.gtr}
              onChange={(e) => setFormData({ ...formData, gtr: e.target.value })} style={styles.input} />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>SCT Number *</label>
            <input type="text" placeholder="e.g., 521406" value={formData.sct}
              onChange={(e) => setFormData({ ...formData, sct: e.target.value })} style={styles.input} />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Date Shipped *</label>
            <input type="date" value={formData.dateShipped}
              onChange={(e) => setFormData({ ...formData, dateShipped: e.target.value })} style={styles.input} />
          </div>

          <div style={styles.divider}></div>
          <h3 style={styles.subheading}>Add Items</h3>

          <div style={styles.itemGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Item Code</label>
              <input type="text" placeholder="e.g., 103999" value={currentItem.itemCode}
                onChange={(e) => setCurrentItem({ ...currentItem, itemCode: e.target.value })} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <input type="text" placeholder="e.g., SMIRNOFF PINE TWIST" value={currentItem.description}
                onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Volume</label>
              <select value={currentItem.volumeMl}
                onChange={(e) => setCurrentItem({ ...currentItem, volumeMl: parseInt(e.target.value) })} style={styles.input}>
                {ubcCans.map(can => <option key={can.ml} value={can.ml}>{can.label}</option>)}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Quantity (units)</label>
              <input type="number" min="0" value={currentItem.quantity}
                onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 0 })} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Pallets</label>
              <input type="number" min="0" value={currentItem.pallets}
                onChange={(e) => setCurrentItem({ ...currentItem, pallets: parseInt(e.target.value) || 0 })} style={styles.input} />
            </div>
            <button style={styles.buttonAdd} onClick={addItem}>Add Item</button>
          </div>

          {formData.items.length > 0 && (
            <div style={styles.itemsList}>
              <h4 style={styles.label}>Added Items:</h4>
              {formData.items.map((item, idx) => (
                <div key={idx} style={styles.itemCard}>
                  <div>
                    <p style={styles.itemText}>{item.itemCode} - {item.description}</p>
                    <p style={styles.itemText}>{item.quantity}x {item.volumeMl}ml = {(item.quantity * item.volumeMl / 1000).toFixed(2)}L
                      {item.pallets > 0 ? ` (${item.pallets} pallets)` : ''}</p>
                  </div>
                  <button style={styles.buttonDelete} onClick={() => removeItem(idx)}>✕</button>
                </div>
              ))}
              <div style={styles.totalsBox}>
                <p><strong>Total Units:</strong> {totals.qty}</p>
                <p><strong>Total Litres:</strong> {totals.litres}L</p>
              </div>
            </div>
          )}

          <div style={styles.divider}></div>
          <h3 style={styles.subheading}>Collection Details</h3>

          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Driver Name</label>
              <input type="text" placeholder="Driver name" value={formData.driverName}
                onChange={(e) => setFormData({ ...formData, driverName: e.target.value })} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Vehicle Info</label>
              <input type="text" placeholder="License plate / vehicle details" value={formData.vehicleInfo}
                onChange={(e) => setFormData({ ...formData, vehicleInfo: e.target.value })} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Farm Destination</label>
              <input type="text" placeholder="Farm name / location" value={formData.farmDestination}
                onChange={(e) => setFormData({ ...formData, farmDestination: e.target.value })} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Accountant Email</label>
              <input type="email" placeholder="accountant@example.com" value={formData.accountantEmail}
                onChange={(e) => setFormData({ ...formData, accountantEmail: e.target.value })} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Client / Farm Email</label>
              <input type="email" placeholder="client@example.com" value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })} style={styles.input} />
            </div>
          </div>

          <div style={styles.buttonGroup}>
            <button style={{ ...styles.buttonPrimary, opacity: loading ? 0.6 : 1 }} onClick={createPOD} disabled={loading}>
              {loading ? 'Creating...' : 'Create POD'}
            </button>
            <button style={styles.buttonSecondary} onClick={() => { resetForm(); setCurrentStep('dashboard'); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {currentStep === 'details' && selectedPod && (
        <div style={styles.section}>
          <button style={styles.buttonBack} onClick={() => { setCurrentStep('dashboard'); setSelectedPod(null); }}>
            ← Back
          </button>

          <h2 style={styles.heading}>POD Details</h2>

          <div style={styles.detailsGrid}>
            <div style={styles.detailCard}>
              <p style={styles.detailLabel}>GTR Reference</p>
              <p style={styles.detailValue}>{selectedPod.gtr}</p>
            </div>
            <div style={styles.detailCard}>
              <p style={styles.detailLabel}>SCT Number</p>
              <p style={styles.detailValue}>{selectedPod.sct}</p>
            </div>
            <div style={styles.detailCard}>
              <p style={styles.detailLabel}>Date Shipped</p>
              <p style={styles.detailValue}>{selectedPod.dateShipped}</p>
            </div>
            <div style={styles.detailCard}>
              <p style={styles.detailLabel}>Date Received</p>
              <p style={styles.detailValue}>{selectedPod.receivedDate}</p>
            </div>
          </div>

          <h3 style={styles.subheading}>Items</h3>
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                <th style={styles.th}>Code</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Volume</th>
                <th style={styles.th}>Qty</th>
                <th style={styles.th}>Pallets</th>
                <th style={styles.th}>Total L</th>
              </tr>
            </thead>
            <tbody>
              {selectedPod.items.map((item, idx) => (
                <tr key={idx} style={styles.tr}>
                  <td style={styles.td}>{item.itemCode}</td>
                  <td style={styles.td}>{item.description}</td>
                  <td style={styles.td}>{item.volumeMl}ml</td>
                  <td style={styles.td}>{item.quantity}</td>
                  <td style={styles.td}>{item.pallets || 0}</td>
                  <td style={styles.td}>{(item.quantity * item.volumeMl / 1000).toFixed(2)}L</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={styles.totalsBox}>
            <p><strong>Total Units:</strong> {selectedPod.totalQuantity}</p>
            <p><strong>Total Litres:</strong> {selectedPod.totalLitres}L</p>
          </div>

          <div style={styles.buttonGroup}>
            <button style={styles.buttonPrimary} onClick={() => downloadPDF(selectedPod.noteId)}>
              Download Collection Note PDF
            </button>
            <button style={styles.buttonSecondary} onClick={() => { setCurrentStep('dashboard'); setSelectedPod(null); }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', backgroundColor: '#f5f7fa', minHeight: '100vh' },
  header: { backgroundColor: '#fff', padding: '30px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  title: { margin: '0 0 8px 0', fontSize: '32px', color: '#1a1a1a', fontWeight: '700' },
  subtitle: { margin: '0', fontSize: '14px', color: '#666', fontWeight: '400' },
  section: { backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  heading: { fontSize: '24px', marginBottom: '20px', color: '#1a1a1a', fontWeight: '600' },
  subheading: { fontSize: '16px', marginTop: '24px', marginBottom: '16px', color: '#333', fontWeight: '600' },
  actionBar: { marginBottom: '24px', display: 'flex', gap: '12px' },
  errorBanner: { backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  errorClose: { background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontWeight: '700' },
  buttonPrimary: { backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  buttonSecondary: { backgroundColor: '#e5e7eb', color: '#333', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  buttonSmall: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' },
  buttonDelete: { backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  buttonBack: { backgroundColor: 'transparent', color: '#2563eb', border: '1px solid #2563eb', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', marginBottom: '20px' },
  buttonAdd: { backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', height: '44px' },
  buttonGroup: { display: 'flex', gap: '12px', marginTop: '30px' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#333' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' },
  itemGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' },
  itemsList: { backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '20px' },
  itemCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '12px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #e5e7eb' },
  itemText: { margin: '4px 0', fontSize: '14px', color: '#333' },
  totalsBox: { backgroundColor: '#fff', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #2563eb', marginTop: '12px' },
  divider: { height: '1px', backgroundColor: '#e5e7eb', margin: '24px 0' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#999' },
  podList: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  thead: { backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' },
  th: { padding: '12px', textAlign: 'left', fontWeight: '600', color: '#333' },
  tr: { borderBottom: '1px solid #e5e7eb' },
  td: { padding: '12px', color: '#666' },
  badge: { display: 'inline-block', backgroundColor: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
  detailsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' },
  detailCard: { backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' },
  detailLabel: { fontSize: '12px', color: '#666', fontWeight: '600', margin: '0 0 8px 0' },
  detailValue: { fontSize: '16px', color: '#1a1a1a', fontWeight: '600', margin: '0' }
};
