with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add certSchema + DestructionCert model right before the model registrations
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

assert content.count(old) == 1, "FAIL: model block not found"
content = content.replace(old, new, 1)
print("OK: certSchema + DestructionCert model added")

# Also verify the PDF generator exists - if not, add it
if 'generateDestructionCertPDF' not in content:
    print("WARNING: generateDestructionCertPDF missing - adding it")
    old2 = "async function sendCollectionEmail(note, photoFiles) {"
    new2 = """function generateDestructionCertPDF(cert) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const pageW = doc.page.width;
    const margin = 60;
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#000').text('OSDAM ECO FACILITY', margin, 60, { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#333');
    doc.text('Patrysfontein, Durbanville', margin, 90, { align: 'center' });
    doc.text('Registration Number: 2014/166690/07', margin, 105, { align: 'center' });
    doc.text('VAT Number: 4070166139', margin, 120, { align: 'center' });
    doc.y = 160;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text('GOOD DESTRUCTION CERTIFICATE', margin, 160, { underline: true, align: 'left' });
    doc.moveDown(0.8);
    doc.fontSize(11).font('Helvetica').text('To Whom It May Concern:', margin);
    doc.moveDown(0.8);
    const tanks = cert.tankerCount || '';
    const items = cert.itemsReceived || '';
    const dateStr = cert.destructionDate || '';
    doc.fontSize(11).font('Helvetica').text('I confirm Osdam Boerdery, Patrysfontein division, received ' + tanks + 'x Tank' + (tanks != 1 ? 's' : '') + ' of ' + items + ' on ' + dateStr + '. It has been destroyed.', margin, doc.y, { width: pageW - margin * 2 });
    doc.moveDown(0.8);
    if (cert.collectionNoteNo) { doc.text('Order No: ' + cert.collectionNoteNo + ' Chill Coll Note', margin); doc.moveDown(0.5); }
    if (cert.weighbridgeNo) { doc.text('Patrysfontein: (Weighbridge NO: ' + cert.weighbridgeNo + ')', margin); doc.moveDown(0.5); }
    if (cert.weightDestroyed) { doc.text('Weight Destroyed: ' + cert.weightDestroyed + ' kg', margin); doc.moveDown(1.2); }
    doc.text('Kind Regards,', margin);
    doc.moveDown(0.5);
    doc.text(cert.signerName || 'J.C.F. Beukes', margin);
    doc.moveDown(0.3);
    let sigY = doc.y;
    if (cert.certSignature) {
      try {
        const sigData = cert.certSignature.replace(/^data:image\\/\\w+;base64,/, '');
        doc.image(Buffer.from(sigData, 'base64'), margin, sigY, { width: 180, height: 70 });
        sigY += 75;
      } catch(e) {}
    }
    doc.moveTo(margin, sigY + 5).lineTo(margin + 250, sigY + 5).stroke();
    doc.fontSize(10).text(cert.signerName || 'J.C.F. Beukes', margin, sigY + 10);
    doc.moveDown(0.3);
    doc.text('Manager of Osdam Boerdery, Patrysfontein', margin);
    doc.end();
  });
}

async function sendCollectionEmail(note, photoFiles) {"""
    assert content.count(old2) == 1, "FAIL: sendCollectionEmail anchor not found"
    content = content.replace(old2, new2, 1)
    print("OK: generateDestructionCertPDF added")
else:
    print("OK: generateDestructionCertPDF already present")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("server.js saved. Lines:", content.count('\n'))
