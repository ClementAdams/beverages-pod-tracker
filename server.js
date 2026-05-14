require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { Resend } = require('resend');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const app = express();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/PODTracker.jsx', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'PODTracker.jsx'));
});

// ─── MongoDB ─────────────────────────────────────────────────

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pod-tracker')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err.message));

const podSchema = new mongoose.Schema({
  podId: { type: String, default: () => uuidv4(), unique: true },
  gtr: String,
  sct: String,
  dateShipped: String,
  receivedDate: String,
  receivedBy: String,
  pallets: Number,
  totalLitres: Number,
  photo: String,
  archived: { type: Boolean, default: false },
  collectionNoteId: String,
  createdAt: { type: Date, default: Date.now }
});

const noteSchema = new mongoose.Schema({
  noteId: { type: String, default: () => uuidv4(), unique: true },
  pods: [mongoose.Schema.Types.Mixed],
  driverName: String,
  vehicleInfo: String,
  farmDestination: String,
  accountantEmail: String,
  driverSignature: String,
  periodStart: String,
  periodEnd: String,
  createdDate: { type: Date, default: Date.now }
});

const Pod = mongoose.model('Pod', podSchema);
const Note = mongoose.model('Note', noteSchema);

// ─── Email ────────────────────────────────────────────────────

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function generateCollectionPDF(note) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(22).font('Helvetica-Bold').text('COLLECTION NOTE', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').text(`Note ID: ${note.noteId}`, { align: 'center' });
    doc.text(`Date Created: ${new Date(note.createdDate).toLocaleDateString()}`, { align: 'center' });
    doc.text(`Period: ${note.periodStart || ''} to ${note.periodEnd || ''}`, { align: 'center' });
    doc.moveDown(1);

    // POD Summary Table
    doc.fontSize(14).font('Helvetica-Bold').text('PODs Received');
    doc.moveDown(0.5);

    const colX = [40, 130, 210, 300, 380, 440, 510];
    const headers = ['GTR', 'SCT', 'Shipped', 'Received', 'Pallets', 'Litres', 'Received By'];
    doc.fontSize(8).font('Helvetica-Bold');
    headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { width: 70, continued: i < headers.length - 1 }));
    doc.text('');
    let y = doc.y + 2;
    doc.moveTo(40, y).lineTo(570, y).stroke();
    y += 5;

    doc.font('Helvetica').fontSize(8);
    note.pods.forEach(p => {
      if (y > 700) { doc.addPage(); y = 40; }
      doc.text(p.gtr || '-', colX[0], y, { width: 85 });
      doc.text(p.sct || '-', colX[1], y, { width: 75 });
      doc.text(p.dateShipped || '-', colX[2], y, { width: 85 });
      doc.text(p.receivedDate || '-', colX[3], y, { width: 75 });
      doc.text(String(p.pallets || 0), colX[4], y, { width: 55 });
      doc.text(`${p.totalLitres || 0}L`, colX[5], y, { width: 65 });
      doc.text(p.receivedBy || '-', colX[6], y, { width: 60 });
      y += 18;
    });

    // Totals
    y += 5;
    doc.moveTo(40, y).lineTo(570, y).stroke();
    y += 8;
    const totalPallets = note.pods.reduce((s, p) => s + (p.pallets || 0), 0);
    const totalLitres = note.pods.reduce((s, p) => s + (p.totalLitres || 0), 0);
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(`Total PODs: ${note.pods.length}`, 40, y);
    doc.text(`Total Pallets: ${totalPallets}`, 200, y);
    doc.text(`Total Litres: ${totalLitres.toFixed(2)}L`, 370, y);

    // Driver info
    y += 35;
    doc.fontSize(12).font('Helvetica-Bold').text('Collection Details', 40, y);
    y += 20;
    doc.fontSize(10).font('Helvetica');
    doc.text(`Driver Name: ${note.driverName || '_________________'}`, 40, y);
    doc.text(`Vehicle: ${note.vehicleInfo || '_________________'}`, 300, y);
    y += 20;
    doc.text(`Farm / Destination: ${note.farmDestination || '_________________'}`, 40, y);

    // Signature
    if (note.driverSignature) {
      y += 35;
      doc.fontSize(10).font('Helvetica-Bold').text('Driver Signature:', 40, y);
      y += 5;
      try {
        const sigData = note.driverSignature.replace(/^data:image\/\w+;base64,/, '');
        doc.image(Buffer.from(sigData, 'base64'), 40, y + 5, { width: 200, height: 80 });
      } catch {}
    }

    // Accountant / Farm sign-off lines
    y = doc.y + 100;
    if (y > 700) { doc.addPage(); y = 40; }
    doc.fontSize(10).font('Helvetica');
    doc.text('Accountant Sign-off: ___________________', 40, y);
    doc.text('Date: _______________', 300, y);
    y += 30;
    doc.text('Farm Received: ___________________', 40, y);
    doc.text('Date: _______________', 300, y);

    doc.end();
  });
}

async function sendCollectionEmail(note, photoFiles) {
  const resend = getResend();
  if (!resend) { console.log('No RESEND_API_KEY set'); return { sent: false, reason: 'Email not configured' }; }

  const pdfBuffer = await generateCollectionPDF(note);
  const totalPallets = note.pods.reduce((s, p) => s + (p.pallets || 0), 0);
  const totalLitres = note.pods.reduce((s, p) => s + (p.totalLitres || 0), 0);

  const html = `<h2>Collection Note</h2>
    <p><b>Period:</b> ${note.periodStart || ''} to ${note.periodEnd || ''}</p>
    <p><b>PODs:</b> ${note.pods.length} | <b>Pallets:</b> ${totalPallets} | <b>Litres:</b> ${totalLitres.toFixed(2)}L</p>
    <p><b>Driver:</b> ${note.driverName || 'N/A'}</p>
    <p><b>Farm:</b> ${note.farmDestination || 'N/A'}</p>
    <p>Collection note PDF and POD photos attached.</p>`;

  const attachments = [
    { filename: `collection-note-${note.noteId}.pdf`, content: pdfBuffer.toString('base64') }
  ];

  photoFiles.forEach((photo, i) => {
    const filePath = path.join(__dirname, photo);
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath);
      attachments.push({
        filename: `POD-photo-${i + 1}${path.extname(photo)}`,
        content: fileContent.toString('base64')
      });
    }
  });

  const recipients = [];
  if (note.accountantEmail) recipients.push(note.accountantEmail);
  const alwaysCC = process.env.EMAIL_CC || 'ch1wasteservice@gmail.com';
  if (!recipients.includes(alwaysCC)) recipients.push(alwaysCC);

  const fromAddr = process.env.EMAIL_FROM || 'POD Tracker <onboarding@resend.dev>';

  const results = [];
  for (const to of recipients) {
    try {
      const { data, error } = await resend.emails.send({
        from: fromAddr,
        to,
        subject: `Collection Note - ${note.periodStart} to ${note.periodEnd}`,
        html,
        attachments
      });
      if (error) throw new Error(error.message);
      console.log('Email sent to:', to, data);
      results.push({ to, sent: true });
    } catch (err) { console.error('Email failed to', to, ':', err.message); results.push({ to, sent: false, error: err.message }); }
  }
  return results;
}

// ─── Routes ───────────────────────────────────────────────────

// Log a single POD (with optional photo)
app.post('/api/pod', upload.single('photo'), async (req, res) => {
  try {
    const pod = await Pod.create({
      gtr: req.body.gtr || '',
      sct: req.body.sct || '',
      dateShipped: req.body.dateShipped || '',
      receivedDate: req.body.receivedDate || new Date().toISOString().split('T')[0],
      receivedBy: req.body.receivedBy || '',
      pallets: parseInt(req.body.pallets) || 0,
      totalLitres: parseFloat(req.body.totalLitres) || 0,
      photo: req.file ? `uploads/${req.file.filename}` : null
    });
    res.json({ success: true, pod });
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.get('/api/pods', async (req, res) => {
  const filter = req.query.archived === 'true' ? { archived: true } : { archived: { $ne: true } };
  const pods = await Pod.find(filter).sort({ createdAt: -1 }).lean();
  res.json(pods);
});

app.delete('/api/pod/:podId', async (req, res) => {
  await Pod.deleteOne({ podId: req.params.podId });
  res.json({ success: true });
});

// Create collection note from selected PODs
app.post('/api/collection-note', async (req, res) => {
  try {
    const { podIds, driverName, vehicleInfo, farmDestination, accountantEmail,
            driverSignature, periodStart, periodEnd } = req.body;
    const selectedPods = await Pod.find({ podId: { $in: podIds } }).lean();
    if (selectedPods.length === 0) return res.status(400).json({ error: 'No PODs selected' });

    const note = await Note.create({
      pods: selectedPods, driverName, vehicleInfo, farmDestination,
      accountantEmail, driverSignature, periodStart, periodEnd
    });

    await Pod.updateMany({ podId: { $in: podIds } }, { archived: true, collectionNoteId: note.noteId });

    res.json({ success: true, noteId: note.noteId });

    setTimeout(() => {
      const photoFiles = selectedPods.map(p => p.photo).filter(Boolean);
      sendCollectionEmail(note.toObject(), photoFiles).catch(err => console.error('Email failed:', err.message));
    }, 100);
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.get('/api/collection-notes', async (req, res) => {
  const notes = await Note.find().sort({ createdDate: -1 }).lean();
  res.json(notes);
});

app.get('/api/collection-note/:noteId/pdf', async (req, res) => {
  const note = await Note.findOne({ noteId: req.params.noteId }).lean();
  if (!note) return res.status(404).json({ error: 'Not found' });
  const pdfBuffer = await generateCollectionPDF(note);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="collection-note-${note.noteId}.pdf"`);
  res.send(pdfBuffer);
});

app.get('/api/email/status', (req, res) => {
  res.json({ configured: !!process.env.RESEND_API_KEY });
});

app.get('/api/version', (req, res) => res.json({ version: 10 }));

app.get('/api/test-email', async (req, res) => {
  try {
    const resend = getResend();
    if (!resend) return res.json({ error: 'No RESEND_API_KEY set' });
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'POD Tracker <onboarding@resend.dev>',
      to: 'ch1wasteservice@gmail.com',
      subject: 'Railway email test via Resend',
      text: 'If you see this, email works from Railway via Resend API.'
    });
    if (error) return res.json({ success: false, error });
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`POD Tracking Server running on port ${PORT}`));
