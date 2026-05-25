with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

old = "const PORT = process.env.PORT || 3001;\napp.listen(PORT, () => console.log(`POD Tracking Server running on port ${PORT}`));"
new = """// Destruction certificate routes
app.post('/api/destruction-cert', auth, async (req, res) => {
  try {
    const cert = await DestructionCert.create({
      collectionNoteNo: req.body.collectionNoteNo || '',
      tankerCount: parseFloat(req.body.tankerCount) || 0,
      itemsReceived: req.body.itemsReceived || '',
      destructionDate: req.body.destructionDate || '',
      weighbridgeNo: req.body.weighbridgeNo || '',
      weightDestroyed: parseFloat(req.body.weightDestroyed) || 0,
      signerName: req.body.signerName || 'J.C.F. Beukes',
      certSignature: req.body.certSignature || ''
    });
    res.json({ success: true, certId: cert.certId });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/destruction-certs', auth, async (req, res) => {
  const certs = await DestructionCert.find().sort({ createdAt: -1 }).lean();
  res.json(certs);
});

app.get('/api/destruction-cert/:certId/pdf', auth, async (req, res) => {
  const cert = await DestructionCert.findOne({ certId: req.params.certId }).lean();
  if (!cert) return res.status(404).json({ error: 'Not found' });
  const pdfBuffer = await generateDestructionCertPDF(cert);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="destruction-cert-${cert.certId}.pdf"`);
  res.send(pdfBuffer);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`POD Tracking Server running on port ${PORT}`));"""
assert content.count(old) == 1, "FAIL: PORT block not found"
content = content.replace(old, new, 1)
print("OK 3. Destruction cert API routes added")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("server.js saved. Length:", len(content))
