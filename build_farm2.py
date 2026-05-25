with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# ── 4. Add email function for farm-saved destruction cert ─────────────────
old = "// Destruction certificate routes"
new = """async function sendDestructionCertEmail(cert) {
  const resend = getResend();
  if (!resend) { console.log('No RESEND_API_KEY'); return; }

  // Generate cert PDF
  const certPdf = await generateDestructionCertPDF(cert);

  // Try to get linked collection note + photos
  let notePdf = null;
  let photoAttachments = [];
  if (cert.collectionNoteNo) {
    const note = await Note.findOne({ collectionNoteNo: cert.collectionNoteNo }).lean();
    if (note) {
      notePdf = await generateCollectionPDF(note);
      note.pods.forEach((p, i) => {
        if (p.photo) {
          const fp = path.join(__dirname, p.photo);
          if (fs.existsSync(fp)) {
            photoAttachments.push({
              filename: 'POD-photo-' + (i + 1) + path.extname(p.photo),
              content: fs.readFileSync(fp).toString('base64')
            });
          }
        }
      });
    }
  }

  const attachments = [
    { filename: 'destruction-certificate-' + cert.certId + '.pdf', content: certPdf.toString('base64') }
  ];
  if (notePdf) attachments.push({ filename: 'collection-note-' + cert.collectionNoteNo + '.pdf', content: notePdf.toString('base64') });
  photoAttachments.forEach(a => attachments.push(a));

  const html = '<h2>Destruction Certificate Saved by Farm</h2>' +
    '<p><b>Collection Note #:</b> ' + (cert.collectionNoteNo || 'N/A') + '</p>' +
    '<p><b>Date:</b> ' + (cert.destructionDate || '') + '</p>' +
    '<p><b>Items:</b> ' + (cert.tankerCount || '') + 'x Tank(s) of ' + (cert.itemsReceived || '') + '</p>' +
    '<p><b>Weight Destroyed:</b> ' + (cert.weightDestroyed || '') + ' kg</p>' +
    '<p><b>Weighbridge No:</b> ' + (cert.weighbridgeNo || '') + '</p>' +
    '<p><b>Signed by:</b> ' + (cert.signerName || '') + '</p>' +
    '<p>Please find the Destruction Certificate, Collection Note and POD photos attached.</p>';

  const recipients = ['ch1wasteservice@gmail.com', 'lucia@jaclu.co.za'];
  const fromAddr = process.env.EMAIL_FROM || 'POD Tracker <onboarding@resend.dev>';
  for (const to of recipients) {
    try {
      await resend.emails.send({ from: fromAddr, to, subject: 'Destruction Certificate - Coll Note #' + (cert.collectionNoteNo || ''), html, attachments });
      console.log('Cert email sent to:', to);
    } catch (err) { console.error('Cert email failed to', to, err.message); }
  }
}

// Destruction certificate routes"""
assert content.count(old) == 1, "FAIL 4"
content = content.replace(old, new, 1)
print("OK 4: sendDestructionCertEmail added")

# ── 5. Call email fn after cert is saved by farm user ─────────────────────
old = "    res.json({ success: true, certId: cert.certId });\n  } catch (err) { res.status(400).json({ error: err.message }); }\n});"
new = """    // If saved by farm, send email to Clem + Lucia with all docs
    if (req.user && req.user.role === 'farm') {
      sendDestructionCertEmail(cert).catch(e => console.error('Cert email error:', e));
    }
    res.json({ success: true, certId: cert.certId });
  } catch (err) { res.status(400).json({ error: err.message }); }
});"""
assert content.count(old) == 1, "FAIL 5"
content = content.replace(old, new, 1)
print("OK 5: email triggered on farm cert save")

# ── 6. Farm-filtered collection notes endpoint ────────────────────────────
old = "app.get('/api/destruction-certs', auth, async (req, res) => {"
new = """// Farm portal: get only notes/certs relevant to this farm user
app.get('/api/farm/notes', auth, async (req, res) => {
  const query = req.user.role === 'farm'
    ? { farmName: req.user.username }
    : {};
  const notes = await Note.find(query).sort({ createdDate: -1 }).lean();
  res.json(notes);
});

app.get('/api/destruction-certs', auth, async (req, res) => {"""
assert content.count(old) == 1, "FAIL 6"
content = content.replace(old, new, 1)
print("OK 6: farm notes endpoint added")

# ── 7. Sage CSV export endpoint ───────────────────────────────────────────
old = "const PORT = process.env.PORT || 3001;"
new = """// Sage CSV export for a collection note
app.get('/api/collection-note/:noteId/sage-csv', auth, async (req, res) => {
  const note = await Note.findOne({ noteId: req.params.noteId }).lean();
  if (!note) return res.status(404).json({ error: 'Not found' });

  const RATE = 607.38;
  const VAT_RATE = 0.15;
  const CUSTOMER_CODE = 'CHIL003';
  const ITEM_CODE = 'COL064';
  const invoiceDate = note.createdDate ? new Date(note.createdDate).toLocaleDateString('en-ZA') : new Date().toLocaleDateString('en-ZA');

  const rows = [];
  // CSV header matching Sage Accounting import format
  rows.push([
    'Customer_Code', 'Invoice_Date', 'Invoice_Number', 'Item_Code',
    'Description', 'Quantity', 'Unit_Price_Excl', 'VAT_Amount', 'Line_Total_Incl', 'Reference'
  ].join(','));

  note.pods.forEach(pod => {
    const pallets = parseFloat(pod.pallets) || 0;
    const excl = pallets * RATE;
    const vat = excl * VAT_RATE;
    const incl = excl + vat;
    const desc = 'Beverage waste collection - GTR: ' + (pod.gtr || '') + ' SCT: ' + (pod.sct || '') + ' Received: ' + (pod.receivedDate || '');
    const ref = 'Coll Note #' + (note.collectionNoteNo || note.noteId.substring(0, 8));
    rows.push([
      CUSTOMER_CODE,
      invoiceDate,
      ref.replace(/,/g, ''),
      ITEM_CODE,
      '"' + desc.replace(/"/g, "'") + '"',
      pallets.toFixed(0),
      excl.toFixed(2),
      vat.toFixed(2),
      incl.toFixed(2),
      '"' + (pod.gtr || pod.sct || '') + '"'
    ].join(','));
  });

  const csv = rows.join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sage-invoice-' + (note.collectionNoteNo || note.noteId.substring(0,8)) + '.csv"');
  res.send(csv);
});

const PORT = process.env.PORT || 3001;"""
assert content.count(old) == 1, "FAIL 7"
content = content.replace(old, new, 1)
print("OK 7: Sage CSV endpoint added")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Phase 2 saved. Lines:", content.count('\n'))
