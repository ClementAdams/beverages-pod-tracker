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
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));
app.get('/PODTracker.jsx', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'PODTracker.jsx'));
});

// ─── JSON File Database ───────────────────────────────────────

const DATA_DIR = path.join(__dirname, 'data');
const PODS_FILE = path.join(DATA_DIR, 'pods.json');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getPods() { return readJSON(PODS_FILE); }
function savePods(pods) { writeJSON(PODS_FILE, pods); }
function getNotes() { return readJSON(NOTES_FILE); }
function saveNotes(notes) { writeJSON(NOTES_FILE, notes); }

// ─── UBC Can Volumes ──────────────────────────────────────────

const UBC_CANS = [
  { ml: 500, label: '500ml' }, { ml: 473, label: '473ml (US)' },
  { ml: 440, label: '440ml' }, { ml: 375, label: '375ml' },
  { ml: 355, label: '355ml' }, { ml: 330, label: '330ml' },
  { ml: 250, label: '250ml' }, { ml: 200, label: '200ml' }
];

// ─── Email ────────────────────────────────────────────────────

function createTransporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

function generatePDFBuffer(note) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const p = note.podData;
    doc.fontSize(20).font('Helvetica-Bold').text('COLLECTION NOTE', 50, 50);
    doc.fontSize(10).font('Helvetica')
      .text(`Note ID: ${note.noteId}`, 50, 75)
      .text(`Date: ${new Date(note.createdDate).toLocaleDateString()}`, 50, 90);

    doc.fontSize(12).font('Helvetica-Bold').text('POD Details', 50, 120);
    doc.fontSize(10).font('Helvetica')
      .text(`GTR Reference: ${p.gtr}`, 50, 140)
      .text(`SCT Number: ${p.sct}`, 50, 155)
      .text(`Date Shipped: ${p.dateShipped}`, 50, 170)
      .text(`Received Date: ${p.receivedDate}`, 50, 185);

    doc.fontSize(12).font('Helvetica-Bold').text('Items', 50, 215);
    let y = 240;
    doc.fontSize(9).font('Helvetica-Bold')
      .text('Item Code', 50, y).text('Description', 150, y)
      .text('Volume', 300, y).text('Qty', 370, y).text('Total L', 420, y);
    y += 15;
    doc.moveTo(50, y - 5).lineTo(550, y - 5).stroke();
    doc.font('Helvetica').fontSize(9);
    p.items.forEach(item => {
      doc.text(item.itemCode || '-', 50, y)
        .text(item.description || '-', 150, y, { width: 140 })
        .text(`${item.volumeMl}ml`, 300, y)
        .text(String(item.quantity), 370, y)
        .text((item.quantity * item.volumeMl / 1000).toFixed(2), 420, y);
      y += 20;
    });
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 10;
    doc.font('Helvetica-Bold').fontSize(10)
      .text(`Total Quantity: ${p.totalQuantity} units`, 50, y)
      .text(`Total Litres: ${p.totalLitres.toFixed(2)}L`, 50, y + 20);

    y += 60;
    doc.fontSize(12).font('Helvetica-Bold').text('Collection Details', 50, y);
    doc.fontSize(10).font('Helvetica')
      .text(`Driver Name: ${note.driverName || '_________________'}`, 50, y + 30)
      .text(`Vehicle Info: ${note.vehicleInfo || '_________________'}`, 50, y + 50)
      .text(`Farm Destination: ${note.farmDestination || '_________________'}`, 50, y + 70);

    y += 120;
    doc.fontSize(10)
      .text('Driver Signature: ___________________', 50, y)
      .text('Driver Date: ___________________', 50, y + 30)
      .text('Accountant Sign-off: ___________________', 300, y)
      .text('Farm Received: ___________________', 300, y + 30);
    doc.end();
  });
}

async function sendCollectionEmail(note, recipients) {
  const transporter = createTransporter();
  if (!transporter) return { sent: false, reason: 'Email not configured' };

  const pdfBuffer = await generatePDFBuffer(note);
  const p = note.podData;
  const html = `<h2>Collection Note - ${p.gtr}</h2>
    <p><b>GTR:</b> ${p.gtr} | <b>SCT:</b> ${p.sct}</p>
    <p><b>Date Shipped:</b> ${p.dateShipped}</p>
    <p><b>Driver:</b> ${note.driverName || 'N/A'} | <b>Farm:</b> ${note.farmDestination || 'N/A'}</p>
    <p><b>Total:</b> ${p.totalQuantity} units / ${p.totalLitres.toFixed(2)}L</p>
    <p>The full collection note PDF is attached.</p>`;

  const results = [];
  for (const to of recipients) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: `Collection Note - GTR ${p.gtr}`,
        html,
        attachments: [{ filename: `collection-note-${note.noteId}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
      });
      results.push({ to, sent: true });
    } catch (err) { results.push({ to, sent: false, error: err.message }); }
  }
  return results;
}

// ─── Routes ───────────────────────────────────────────────────

app.post('/api/pod/scan', upload.single('image'), (req, res) => {
  try {
    const podId = uuidv4();
    const items = JSON.parse(req.body.items || '[]');
    let totalQuantity = 0, totalLitres = 0;
    items.forEach(i => { totalQuantity += i.quantity; totalLitres += (i.quantity * i.volumeMl) / 1000; });

    const pod = {
      podId, gtr: req.body.gtr || 'PENDING', sct: req.body.sct || 'PENDING',
      dateShipped: req.body.dateShipped || new Date().toISOString().split('T')[0],
      receivedDate: new Date().toISOString().split('T')[0],
      items, imagePath: req.file ? req.file.path : null,
      totalQuantity, totalLitres, status: 'received', noteId: null
    };

    const pods = getPods();
    pods.push(pod);
    savePods(pods);
    res.json({ success: true, podId, podData: pod });
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.get('/api/pod/:podId', (req, res) => {
  const pod = getPods().find(p => p.podId === req.params.podId);
  if (!pod) return res.status(404).json({ error: 'POD not found' });
  res.json(pod);
});

app.post('/api/collection-note', async (req, res) => {
  try {
    const { podId, driverName, vehicleInfo, farmDestination, accountantEmail, clientEmail } = req.body;
    const pods = getPods();
    const pod = pods.find(p => p.podId === podId);
    if (!pod) return res.status(404).json({ error: 'POD not found' });

    const noteId = uuidv4();
    const note = {
      noteId, podId, driverName, vehicleInfo, farmDestination,
      createdDate: new Date().toISOString(),
      podData: pod, signatures: { driver: null, accountant: null, farm: null }
    };

    const notes = getNotes();
    notes.push(note);
    saveNotes(notes);

    pod.noteId = noteId;
    savePods(pods);

    const recipients = [accountantEmail, clientEmail].filter(Boolean);
    let emailResult = null;
    if (recipients.length > 0) emailResult = await sendCollectionEmail(note, recipients);

    res.json({ success: true, noteId, collectionData: note, emailResult });
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.get('/api/collection-note/:noteId/pdf', async (req, res) => {
  const note = getNotes().find(n => n.noteId === req.params.noteId);
  if (!note) return res.status(404).json({ error: 'Collection note not found' });
  const pdfBuffer = await generatePDFBuffer(note);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="collection-note-${note.noteId}.pdf"`);
  res.send(pdfBuffer);
});

app.post('/api/collection-note/:noteId/email', async (req, res) => {
  const note = getNotes().find(n => n.noteId === req.params.noteId);
  if (!note) return res.status(404).json({ error: 'Collection note not found' });
  const { recipients } = req.body;
  if (!recipients || recipients.length === 0) return res.status(400).json({ error: 'No recipients' });
  const result = await sendCollectionEmail(note, recipients);
  res.json({ success: true, result });
});

app.get('/api/ubc-cans', (req, res) => res.json(UBC_CANS));

app.patch('/api/collection-note/:noteId/sign', (req, res) => {
  const notes = getNotes();
  const note = notes.find(n => n.noteId === req.params.noteId);
  if (!note) return res.status(404).json({ error: 'Collection note not found' });
  const { role, signatureData } = req.body;
  if (['driver', 'accountant', 'farm'].includes(role)) {
    note.signatures[role] = signatureData;
    saveNotes(notes);
  }
  res.json({ success: true, note });
});

app.get('/api/pods', (req, res) => {
  const pods = getPods().reverse().map(p => ({
    podId: p.podId, gtr: p.gtr, sct: p.sct, receivedDate: p.receivedDate,
    totalQuantity: p.totalQuantity, totalLitres: p.totalLitres.toFixed(2),
    status: p.status, noteId: p.noteId
  }));
  res.json(pods);
});

app.get('/api/email/status', (req, res) => {
  res.json({ configured: !!process.env.SMTP_HOST, host: process.env.SMTP_HOST || null });
});

// ─── Start ────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`POD Tracking Server running on port ${PORT}`));
