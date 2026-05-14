const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
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

// ─── MongoDB Models ───────────────────────────────────────────

const podSchema = new mongoose.Schema({
  podId: { type: String, required: true, unique: true },
  gtr: String,
  sct: String,
  dateShipped: String,
  receivedDate: String,
  items: [{
    itemCode: String,
    description: String,
    volumeMl: Number,
    quantity: Number,
    pallets: Number
  }],
  imagePath: String,
  totalQuantity: Number,
  totalLitres: Number,
  status: { type: String, default: 'received' },
  noteId: String
}, { timestamps: true });

const noteSchema = new mongoose.Schema({
  noteId: { type: String, required: true, unique: true },
  podId: String,
  driverName: String,
  vehicleInfo: String,
  farmDestination: String,
  createdDate: String,
  podData: Object,
  signatures: {
    driver: String,
    accountant: String,
    farm: String
  }
}, { timestamps: true });

const Pod = mongoose.model('Pod', podSchema);
const CollectionNote = mongoose.model('CollectionNote', noteSchema);

// ─── Email Setup ──────────────────────────────────────────────

const UBC_CANS = [
  { ml: 500, label: '500ml' },
  { ml: 473, label: '473ml (US)' },
  { ml: 440, label: '440ml' },
  { ml: 375, label: '375ml' },
  { ml: 355, label: '355ml' },
  { ml: 330, label: '330ml' },
  { ml: 250, label: '250ml' },
  { ml: 200, label: '200ml' }
];

function createTransporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

function generatePDFBuffer(note) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const podData = note.podData;
    doc.fontSize(20).font('Helvetica-Bold').text('COLLECTION NOTE', 50, 50);
    doc.fontSize(10).font('Helvetica').text(`Note ID: ${note.noteId}`, 50, 75);
    doc.text(`Date: ${new Date(note.createdDate).toLocaleDateString()}`, 50, 90);

    doc.fontSize(12).font('Helvetica-Bold').text('POD Details', 50, 120);
    doc.fontSize(10).font('Helvetica')
      .text(`GTR Reference: ${podData.gtr}`, 50, 140)
      .text(`SCT Number: ${podData.sct}`, 50, 155)
      .text(`Date Shipped: ${podData.dateShipped}`, 50, 170)
      .text(`Received Date: ${podData.receivedDate}`, 50, 185);

    doc.fontSize(12).font('Helvetica-Bold').text('Items', 50, 215);
    let yPos = 240;
    doc.fontSize(9).font('Helvetica-Bold')
      .text('Item Code', 50, yPos)
      .text('Description', 150, yPos)
      .text('Volume', 300, yPos)
      .text('Qty', 370, yPos)
      .text('Total L', 420, yPos);
    yPos += 15;
    doc.moveTo(50, yPos - 5).lineTo(550, yPos - 5).stroke();

    doc.font('Helvetica').fontSize(9);
    podData.items.forEach(item => {
      doc.text(item.itemCode || '-', 50, yPos)
        .text(item.description || '-', 150, yPos, { width: 140 })
        .text(`${item.volumeMl}ml`, 300, yPos)
        .text(item.quantity, 370, yPos)
        .text((item.quantity * item.volumeMl / 1000).toFixed(2), 420, yPos);
      yPos += 20;
    });

    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    doc.font('Helvetica-Bold').fontSize(10);
    yPos += 10;
    doc.text(`Total Quantity: ${podData.totalQuantity} units`, 50, yPos);
    doc.text(`Total Litres: ${podData.totalLitres.toFixed(2)}L`, 50, yPos + 20);

    yPos += 60;
    doc.fontSize(12).font('Helvetica-Bold').text('Collection Details', 50, yPos);
    doc.fontSize(10).font('Helvetica')
      .text(`Driver Name: ${note.driverName || '_________________'}`, 50, yPos + 30)
      .text(`Vehicle Info: ${note.vehicleInfo || '_________________'}`, 50, yPos + 50)
      .text(`Farm Destination: ${note.farmDestination || '_________________'}`, 50, yPos + 70);

    yPos += 120;
    doc.fontSize(10);
    doc.text('Driver Signature: ___________________', 50, yPos);
    doc.text('Driver Date: ___________________', 50, yPos + 30);
    doc.text('Accountant Sign-off: ___________________', 300, yPos);
    doc.text('Farm Received: ___________________', 300, yPos + 30);

    doc.end();
  });
}

async function sendCollectionEmail(note, recipients) {
  const transporter = createTransporter();
  if (!transporter) {
    console.log('Email not configured (set SMTP_* env vars). Skipping email.');
    return { sent: false, reason: 'Email not configured' };
  }

  const pdfBuffer = await generatePDFBuffer(note);
  const podData = note.podData;

  const html = `
    <h2>Collection Note - ${podData.gtr}</h2>
    <p><strong>GTR:</strong> ${podData.gtr} | <strong>SCT:</strong> ${podData.sct}</p>
    <p><strong>Date Shipped:</strong> ${podData.dateShipped}</p>
    <p><strong>Driver:</strong> ${note.driverName || 'N/A'}</p>
    <p><strong>Farm:</strong> ${note.farmDestination || 'N/A'}</p>
    <p><strong>Total:</strong> ${podData.totalQuantity} units / ${podData.totalLitres.toFixed(2)}L</p>
    <p>The full collection note PDF is attached.</p>
  `;

  const results = [];
  for (const to of recipients) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: `Collection Note - GTR ${podData.gtr}`,
        html,
        attachments: [{
          filename: `collection-note-${note.noteId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }]
      });
      results.push({ to, sent: true });
    } catch (err) {
      results.push({ to, sent: false, error: err.message });
    }
  }
  return results;
}

// ─── API Routes ───────────────────────────────────────────────

app.post('/api/pod/scan', upload.single('image'), async (req, res) => {
  try {
    const podId = uuidv4();
    const items = JSON.parse(req.body.items || '[]');
    let totalQuantity = 0, totalLitres = 0;
    items.forEach(item => {
      totalQuantity += item.quantity;
      totalLitres += (item.quantity * item.volumeMl) / 1000;
    });

    const pod = await Pod.create({
      podId,
      gtr: req.body.gtr || 'PENDING',
      sct: req.body.sct || 'PENDING',
      dateShipped: req.body.dateShipped || new Date().toISOString().split('T')[0],
      receivedDate: new Date().toISOString().split('T')[0],
      items,
      imagePath: req.file ? req.file.path : null,
      totalQuantity,
      totalLitres,
      status: 'received'
    });

    res.json({ success: true, podId, podData: pod });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/pod/:podId', async (req, res) => {
  const pod = await Pod.findOne({ podId: req.params.podId });
  if (!pod) return res.status(404).json({ error: 'POD not found' });
  res.json(pod);
});

app.post('/api/collection-note', async (req, res) => {
  try {
    const { podId, driverName, vehicleInfo, farmDestination, accountantEmail, clientEmail } = req.body;
    const pod = await Pod.findOne({ podId });
    if (!pod) return res.status(404).json({ error: 'POD not found' });

    const noteId = uuidv4();
    const note = await CollectionNote.create({
      noteId,
      podId,
      driverName,
      vehicleInfo,
      farmDestination,
      createdDate: new Date().toISOString(),
      podData: pod.toObject(),
      signatures: { driver: null, accountant: null, farm: null }
    });

    pod.noteId = noteId;
    await pod.save();

    const recipients = [accountantEmail, clientEmail].filter(Boolean);
    let emailResult = null;
    if (recipients.length > 0) {
      emailResult = await sendCollectionEmail(note, recipients);
    }

    res.json({ success: true, noteId, collectionData: note, emailResult });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/collection-note/:noteId/pdf', async (req, res) => {
  const note = await CollectionNote.findOne({ noteId: req.params.noteId });
  if (!note) return res.status(404).json({ error: 'Collection note not found' });

  const pdfBuffer = await generatePDFBuffer(note);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="collection-note-${note.noteId}.pdf"`);
  res.send(pdfBuffer);
});

app.post('/api/collection-note/:noteId/email', async (req, res) => {
  const note = await CollectionNote.findOne({ noteId: req.params.noteId });
  if (!note) return res.status(404).json({ error: 'Collection note not found' });

  const { recipients } = req.body;
  if (!recipients || recipients.length === 0) {
    return res.status(400).json({ error: 'No recipients provided' });
  }

  const result = await sendCollectionEmail(note, recipients);
  res.json({ success: true, result });
});

app.get('/api/ubc-cans', (req, res) => {
  res.json(UBC_CANS);
});

app.patch('/api/collection-note/:noteId/sign', async (req, res) => {
  const note = await CollectionNote.findOne({ noteId: req.params.noteId });
  if (!note) return res.status(404).json({ error: 'Collection note not found' });

  const { role, signatureData } = req.body;
  if (['driver', 'accountant', 'farm'].includes(role)) {
    note.signatures[role] = signatureData;
    await note.save();
  }

  res.json({ success: true, note });
});

app.get('/api/pods', async (req, res) => {
  const pods = await Pod.find().sort({ createdAt: -1 }).lean();
  res.json(pods.map(p => ({
    podId: p.podId,
    gtr: p.gtr,
    sct: p.sct,
    receivedDate: p.receivedDate,
    totalQuantity: p.totalQuantity,
    totalLitres: p.totalLitres.toFixed(2),
    status: p.status,
    noteId: p.noteId
  })));
});

app.get('/api/email/status', (req, res) => {
  const configured = !!process.env.SMTP_HOST;
  res.json({ configured, host: process.env.SMTP_HOST || null });
});

// ─── Start ────────────────────────────────────────────────────

const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3001;

async function start() {
  if (MONGO_URI && !MONGO_URI.includes('USERNAME:PASSWORD')) {
    try {
      await mongoose.connect(MONGO_URI);
      console.log('Connected to MongoDB');
    } catch (err) {
      console.error('MongoDB connection failed:', err.message);
      process.exit(1);
    }
  } else {
    console.log('No MONGO_URI configured - using in-memory storage (data lost on restart)');
    setupInMemoryFallback();
  }
  app.listen(PORT, () => console.log(`POD Tracking Server running on port ${PORT}`));
}

function setupInMemoryFallback() {
  const pods = new Map();
  const notes = new Map();

  Pod.create = async (data) => { const d = { ...data, toObject() { return d; }, save() { pods.set(d.podId, d); return d; } }; pods.set(d.podId, d); return d; };
  Pod.findOne = async (q) => { const p = pods.get(q.podId); if (!p) return null; p.save = async () => { pods.set(p.podId, p); }; p.toObject = () => ({ ...p }); return p; };
  Pod.find = () => ({ sort: () => ({ lean: async () => Array.from(pods.values()).reverse() }) });

  CollectionNote.create = async (data) => { notes.set(data.noteId, data); return data; };
  CollectionNote.findOne = async (q) => { const n = notes.get(q.noteId); if (!n) return null; n.save = async () => { notes.set(n.noteId, n); }; return n; };
}

start();
