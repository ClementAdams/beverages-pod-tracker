with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Add DestructionCert schema after Note/User models ──────────────────
old = "const Pod = mongoose.model('Pod', podSchema);\nconst Note = mongoose.model('Note', noteSchema);\nconst User = mongoose.model('User', userSchema);"
new = """const certSchema = new mongoose.Schema({
  certId: { type: String, default: () => uuidv4(), unique: true },
  collectionNoteNo: String,
  tankerCount: Number,
  itemsReceived: String,
  destructionDate: String,
  weighbridgeNo: String,
  weightDestroyed: Number,
  signerName: String,
  certSignature: String,
  createdAt: { type: Date, default: Date.now }
});

const Pod = mongoose.model('Pod', podSchema);
const Note = mongoose.model('Note', noteSchema);
const User = mongoose.model('User', userSchema);
const DestructionCert = mongoose.model('DestructionCert', certSchema);"""
assert content.count(old) == 1, "FAIL step 1"
content = content.replace(old, new, 1)
print("OK 1. DestructionCert schema added")

# ── 2. Add PDF generator for destruction cert ──────────────────────────────
old = "async function sendCollectionEmail(note, photoFiles) {"
new = """function generateDestructionCertPDF(cert) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const margin = 60;

    // ─ Logo placeholder circle + OSDAM ECO FACILITY ─
    doc.save();
    doc.circle(pageW / 2, 90, 45).lineWidth(2).stroke('#333');
    doc.fontSize(10).font('Helvetica').fillColor('#333').text('OSDAM', pageW / 2 - 20, 78);
    doc.fontSize(8).text('ECO FACILITY', pageW / 2 - 25, 92);
    doc.restore();

    // Company details top-right
    doc.fontSize(10).font('Helvetica').fillColor('#333');
    doc.text('Patrysfontein, Durbanville', pageW - 260, 150, { width: 200, align: 'right' });
    doc.text('Registration Number: 2014/166690/07', pageW - 260, 165, { width: 200, align: 'right' });
    doc.text('VAT Number: 4070166139', pageW - 260, 180, { width: 200, align: 'right' });

    // Certificate title
    doc.y = 220;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000');
    doc.text('GOOD DESTRUCTION CERTIFICATE', margin, 220, { underline: true, align: 'left' });
    doc.moveDown(0.8);

    // To Whom
    doc.fontSize(11).font('Helvetica').text('To Whom It May Concern:', margin);
    doc.moveDown(0.8);

    // Main paragraph
    const dateStr = cert.destructionDate || '';
    const tanks = cert.tankerCount || '';
    const items = cert.itemsReceived || '';
    doc.fontSize(11).font('Helvetica').text(
      `I confirm Osdam Boerdery, Patrysfontein division, received ${tanks}x Tank${tanks != 1 ? 's' : ''} of ${items} on ${dateStr}. It has been destroyed.`,
      margin, doc.y, { width: pageW - margin * 2 }
    );
    doc.moveDown(0.8);

    // Order / Collection Note
    if (cert.collectionNoteNo) {
      doc.fontSize(11).font('Helvetica').text(`Order No: ${cert.collectionNoteNo} Chill Coll Note`, margin);
      doc.moveDown(0.5);
    }

    // Weighbridge
    if (cert.weighbridgeNo) {
      doc.fontSize(11).font('Helvetica').text(`Patrysfontein: (Weighbridge NO: ${cert.weighbridgeNo})`, margin);
      doc.moveDown(0.5);
    }

    // Weight
    if (cert.weightDestroyed) {
      doc.fontSize(11).font('Helvetica').text(`Weight Destroyed: ${cert.weightDestroyed} kg`, margin);
      doc.moveDown(1.2);
    }

    // Kind Regards
    doc.fontSize(11).font('Helvetica').text('Kind Regards,', margin);
    doc.moveDown(0.5);
    doc.text(cert.signerName || 'J.C.F. Beukes', margin);
    doc.moveDown(0.3);

    // Signature image
    let sigY = doc.y;
    if (cert.certSignature) {
      try {
        const sigData = cert.certSignature.replace(/^data:image\/\w+;base64,/, '');
        doc.image(Buffer.from(sigData, 'base64'), margin, sigY, { width: 180, height: 70 });
        sigY += 75;
      } catch {}
    }

    // Signature line
    doc.moveTo(margin, sigY + 5).lineTo(margin + 250, sigY + 5).stroke();
    doc.fontSize(10).text(cert.signerName || 'J.C.F. Beukes', margin, sigY + 10);
    doc.moveDown(0.3);
    doc.text('Manager of Osdam Boerdery, Patrysfontein', margin);

    doc.end();
  });
}

async function sendCollectionEmail(note, photoFiles) {"""
assert content.count(old) == 1, "FAIL step 2"
content = content.replace(old, new, 1)
print("OK 2. generateDestructionCertPDF added")

# ── 3. Add destruction cert API routes before the start block ─────────────
old = "// \u2500\u2500\u2500 Start \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\nconst PORT"
new = """// Create destruction certificate
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

// \u2500\u2500\u2500 Start \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const PORT"""
assert content.count(old) == 1, "FAIL step 3"
content = content.replace(old, new, 1)
print("OK 3. Destruction cert API routes added")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("server.js saved. Length:", len(content))
