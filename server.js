require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

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

// ─── JSON File Database ───────────────────────────────────────

const DATA_DIR = path.join(__dirname, 'data');
const PODS_FILE = path.join(DATA_DIR, 'pods.json');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readJSON(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; } }
function writeJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

// ─── Email ────────────────────────────────────────────────────

function createTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
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
  const transporter = createTransporter();
  if (!transporter) return { sent: false, reason: 'Email not configured' };

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
    { filename: `collection-note-${note.noteId}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }
  ];

  photoFiles.forEach((photo, i) => {
    const filePath = path.join(__dirname, photo);
    if (fs.existsSync(filePath)) {
      attachments.push({
        filename: `POD-photo-${i + 1}${path.extname(photo)}`,
        path: filePath
      });
    }
  });

  const recipients = [process.env.SMTP_FROM];
  if (note.accountantEmail) recipients.push(note.accountantEmail);

  const results = [];
  for (const to of recipients) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to, subject: `Collection Note - ${note.periodStart} to ${note.periodEnd}`,
        html, attachments
      });
      results.push({ to, sent: true });
    } catch (err) { results.push({ to, sent: false, error: err.message }); }
  }
  return results;
}

// ─── Routes ───────────────────────────────────────────────────

// Log a single POD (with optional photo)
app.post('/api/pod', upload.single('photo'), (req, res) => {
  try {
    const pod = {
      podId: uuidv4(),
      gtr: req.body.gtr || '',
      sct: req.body.sct || '',
      dateShipped: req.body.dateShipped || '',
      receivedDate: req.body.receivedDate || new Date().toISOString().split('T')[0],
      receivedBy: req.body.receivedBy || '',
      pallets: parseInt(req.body.pallets) || 0,
      totalLitres: parseFloat(req.body.totalLitres) || 0,
      photo: req.file ? `uploads/${req.file.filename}` : null,
      createdAt: new Date().toISOString()
    };
    const pods = readJSON(PODS_FILE);
    pods.push(pod);
    writeJSON(PODS_FILE, pods);
    res.json({ success: true, pod });
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.get('/api/pods', (req, res) => res.json(readJSON(PODS_FILE).reverse()));

app.delete('/api/pod/:podId', (req, res) => {
  const pods = readJSON(PODS_FILE).filter(p => p.podId !== req.params.podId);
  writeJSON(PODS_FILE, pods);
  res.json({ success: true });
});

// Create collection note from selected PODs
app.post('/api/collection-note', async (req, res) => {
  try {
    const { podIds, driverName, vehicleInfo, farmDestination, accountantEmail,
            driverSignature, periodStart, periodEnd } = req.body;
    const allPods = readJSON(PODS_FILE);
    const selectedPods = allPods.filter(p => podIds.includes(p.podId));
    if (selectedPods.length === 0) return res.status(400).json({ error: 'No PODs selected' });

    const noteId = uuidv4();
    const note = {
      noteId, pods: selectedPods, driverName, vehicleInfo, farmDestination,
      accountantEmail, driverSignature, periodStart, periodEnd,
      createdDate: new Date().toISOString()
    };

    const notes = readJSON(NOTES_FILE);
    notes.push(note);
    writeJSON(NOTES_FILE, notes);

    res.json({ success: true, noteId });

    setTimeout(() => {
      const photoFiles = selectedPods.map(p => p.photo).filter(Boolean);
      sendCollectionEmail(note, photoFiles).catch(err => console.error('Email failed:', err.message));
    }, 100);
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.get('/api/collection-notes', (req, res) => res.json(readJSON(NOTES_FILE).reverse()));

app.get('/api/collection-note/:noteId/pdf', async (req, res) => {
  const note = readJSON(NOTES_FILE).find(n => n.noteId === req.params.noteId);
  if (!note) return res.status(404).json({ error: 'Not found' });
  const pdfBuffer = await generateCollectionPDF(note);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="collection-note-${note.noteId}.pdf"`);
  res.send(pdfBuffer);
});

app.get('/api/email/status', (req, res) => {
  res.json({ configured: !!process.env.SMTP_HOST });
});

app.get('/api/version', (req, res) => res.json({ version: 4 }));

// ─── Start ────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`POD Tracking Server running on port ${PORT}`));
