with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add the PDF generator function right before the destruction cert routes
old = "// Destruction certificate routes\napp.post('/api/destruction-cert'"
new = """function generateDestructionCertPDF(cert) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const margin = 60;

    // Header
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#000')
       .text('OSDAM ECO FACILITY', margin, 60, { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#333');
    doc.text('Patrysfontein, Durbanville', margin, 88, { align: 'center' });
    doc.text('Registration Number: 2014/166690/07', margin, 103, { align: 'center' });
    doc.text('VAT Number: 4070166139', margin, 118, { align: 'center' });

    // Title
    doc.y = 155;
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#000')
       .text('GOOD DESTRUCTION CERTIFICATE', margin, 155, { underline: true, align: 'left' });
    doc.moveDown(0.8);
    doc.fontSize(11).font('Helvetica').text('To Whom It May Concern:', margin);
    doc.moveDown(0.8);

    // Main paragraph
    const tanks = cert.tankerCount || '';
    const items = cert.itemsReceived || '';
    const dateStr = cert.destructionDate || '';
    doc.fontSize(11).font('Helvetica').text(
      'I confirm Osdam Boerdery, Patrysfontein division, received ' +
      tanks + 'x Tank' + (String(tanks) !== '1' ? 's' : '') +
      ' of ' + items + ' on ' + dateStr + '. It has been destroyed.',
      margin, doc.y, { width: pageW - margin * 2 }
    );
    doc.moveDown(0.8);

    if (cert.collectionNoteNo) {
      doc.text('Order No: ' + cert.collectionNoteNo + ' Chill Coll Note', margin);
      doc.moveDown(0.5);
    }
    if (cert.weighbridgeNo) {
      doc.text('Patrysfontein: (Weighbridge NO: ' + cert.weighbridgeNo + ')', margin);
      doc.moveDown(0.5);
    }
    if (cert.weightDestroyed) {
      doc.text('Weight Destroyed: ' + cert.weightDestroyed + ' kg', margin);
      doc.moveDown(1.2);
    }

    doc.text('Kind Regards,', margin);
    doc.moveDown(0.5);
    doc.text(cert.signerName || 'J.C.F. Beukes', margin);
    doc.moveDown(0.3);

    // Signature
    let sigY = doc.y;
    if (cert.certSignature) {
      try {
        const sigData = cert.certSignature.replace(/^data:image\/\w+;base64,/, '');
        doc.image(Buffer.from(sigData, 'base64'), margin, sigY, { width: 180, height: 70 });
        sigY += 78;
      } catch (e) { sigY += 10; }
    }
    doc.moveTo(margin, sigY + 5).lineTo(margin + 250, sigY + 5).stroke();
    doc.fontSize(10).text(cert.signerName || 'J.C.F. Beukes', margin, sigY + 10);
    doc.moveDown(0.3);
    doc.text('Manager of Osdam Boerdery, Patrysfontein', margin);

    doc.end();
  });
}

// Destruction certificate routes
app.post('/api/destruction-cert'"""

assert content.count(old) == 1, "FAIL: anchor not found"
content = content.replace(old, new, 1)
print("OK: generateDestructionCertPDF added")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Saved. Lines:", content.count('\n'))
