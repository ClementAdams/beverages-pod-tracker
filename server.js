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

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'pod-tracker-secret-key-change-in-production';

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
  totalUnits: Number,
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
  manifestNumber: String,
  manifestPhoto: String,
  driverSignature: String,
  periodStart: String,
  periodEnd: String,
  collectionNoteNo: String,
  farmName: String,
  createdDate: { type: Date, default: Date.now },
  emailStatus: [{ to: String, sent: Boolean, error: String, sentAt: Date }]
});

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'crew', 'farm'], default: 'crew' },
  createdAt: { type: Date, default: Date.now }
});

const certSchema = new mongoose.Schema({
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
const DestructionCert = mongoose.model('DestructionCert', certSchema);

// Create default admin if none exists
mongoose.connection.once('open', async () => {
  const defaultUsers = [
    { username: 'admin', password: 'admin123',   role: 'admin' },
    { username: 'lucia', password: 'Lucia@2026',  role: 'admin' },
    { username: 'clem',  password: 'Clem@2026',   role: 'admin' },
    { username: 'osdam', password: 'Osdam@2026',  role: 'farm'  },
    { username: 'Chill', password: 'password123', role: 'crew'  },
  ];
  for (const u of defaultUsers) {
    const existing = await User.findOne({ username: u.username });
    if (!existing) {
      const hash = await bcrypt.hash(u.password, 10);
      await User.create({ username: u.username, password: hash, role: u.role });
      console.log('Created user:', u.username);
    }
  }
  console.log('User setup complete');
});

// Auth middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { return res.status(401).json({ error: 'Invalid token' }); }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

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
    doc.fontSize(14).font('Helvetica-Bold').text('JOHENCAR TRANSPORT AND RECYCLING', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Beverage Waste Collection Services', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(22).font('Helvetica-Bold').text('COLLECTION NOTE', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').text(`Note ID: ${note.noteId}`, { align: 'center' });
    doc.text(`Date Created: ${new Date(note.createdDate).toLocaleDateString()}`, { align: 'center' });
    doc.text(`Period: ${note.periodStart || ''} to ${note.periodEnd || ''}`, { align: 'center' });
    if (note.collectionNoteNo) {
      doc.fontSize(12).font('Helvetica-Bold').text(`Collection Note #: ${note.collectionNoteNo}`, { align: 'center' });
      doc.fontSize(10).font('Helvetica');
    }
    if (note.manifestNumber) {
      doc.text(`Manifest Number: ${note.manifestNumber}`, { align: 'center' });
    }
    doc.moveDown(1);

    // POD Summary Table
    doc.fontSize(14).font('Helvetica-Bold').text('PODs Received');
    doc.moveDown(0.5);

    // Table layout: page width 595, margins 40 each side = 515 usable
    // GTR(90) SCT(65) DateShipped(80) DateRecv(80) Pallets(45) Units(45) RecvBy(110)
    const colX = [40,  130, 195, 275,  355, 400, 445];
    const colW = [85,  60,  75,  75,   40,  40,  110];
    const headers = ['GTR', 'SCT', 'Date Shipped', 'Date Received', 'Pallets', 'Units', 'Received By'];
    doc.fontSize(8).font('Helvetica-Bold');
    let hdrY = doc.y;
    headers.forEach((h, i) => doc.text(h, colX[i], hdrY, { width: colW[i], lineBreak: false }));
    let y = hdrY + 14;
    doc.moveTo(40, y).lineTo(555, y).stroke();
    y += 5;

    doc.font('Helvetica').fontSize(8);
    note.pods.forEach(p => {
      if (y > 700) { doc.addPage(); y = 40; }
      doc.text(p.gtr || '-',              colX[0], y, { width: colW[0], lineBreak: false });
      doc.text(p.sct || '-',              colX[1], y, { width: colW[1], lineBreak: false });
      doc.text(p.dateShipped || '-',      colX[2], y, { width: colW[2], lineBreak: false });
      doc.text(p.receivedDate || '-',     colX[3], y, { width: colW[3], lineBreak: false });
      doc.text(String(p.pallets || 0),    colX[4], y, { width: colW[4], lineBreak: false });
      doc.text(String(p.totalUnits || 0), colX[5], y, { width: colW[5], lineBreak: false });
      doc.text(p.receivedBy || '-',       colX[6], y, { width: colW[6], lineBreak: false });
      y += 16;
    });

    // Totals
    y += 5;
    doc.moveTo(40, y).lineTo(570, y).stroke();
    y += 8;
    const totalPallets = note.pods.reduce((s, p) => s + (p.pallets || 0), 0);
    const totalUnits = note.pods.reduce((s, p) => s + (p.totalUnits || 0), 0);
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(`Total PODs: ${note.pods.length}`, 40, y);
    doc.text(`Total Pallets: ${totalPallets}`, 200, y);
    doc.text(`Total Units: ${totalUnits.toFixed(2)}`, 370, y);

    // Driver info
    y += 35;
    doc.fontSize(12).font('Helvetica-Bold').text('Collection Details', 40, y);
    y += 20;
    doc.fontSize(10).font('Helvetica');
    doc.text(`Driver Name: ${note.driverName || '_________________'}`, 40, y);
    doc.text(`Vehicle: ${note.vehicleInfo || '_________________'}`, 300, y);
    y += 20;
    doc.text(`Farm / Destination: ${note.farmDestination || 'Osdam Farm'}`, 40, y);

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
  const totalUnits = note.pods.reduce((s, p) => s + (p.totalUnits || 0), 0);

  const html = `<h2>Collection Note</h2>
    <p><b>Period:</b> ${note.periodStart || ''} to ${note.periodEnd || ''}</p>
    ${note.manifestNumber ? `<p><b>Manifest Number:</b> ${note.manifestNumber}</p>` : ''}
    <p><b>PODs:</b> ${note.pods.length} | <b>Pallets:</b> ${totalPallets} | <b>Units:</b> ${totalUnits.toFixed(2)}</p>
    <p><b>Driver:</b> ${note.driverName || 'N/A'}</p>
    <p><b>Farm:</b> ${note.farmDestination || 'N/A'}</p>
    <p>Collection note PDF, manifest photo, and POD photos attached.</p>`;

  const attachments = [
    { filename: `collection-note-${note.noteId}.pdf`, content: pdfBuffer.toString('base64') }
  ];

  // Add manifest photo if available
  if (note.manifestPhoto) {
    const manifestPath = path.join(__dirname, note.manifestPhoto);
    if (fs.existsSync(manifestPath)) {
      const manifestContent = fs.readFileSync(manifestPath);
      attachments.push({
        filename: `Manifest-${note.manifestNumber || note.noteId}${path.extname(note.manifestPhoto)}`,
        content: manifestContent.toString('base64')
      });
    }
  }

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

// ─── Auth Routes ─────────────────────────────────────────────

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { username: user.username, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', auth, adminOnly, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const hash = await bcrypt.hash(password, 10);
    await User.create({ username, password: hash, role: role || 'crew' });
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/users', auth, adminOnly, async (req, res) => {
  const users = await User.find().select('-password').lean();
  res.json(users);
});

app.delete('/api/users/:id', auth, adminOnly, async (req, res) => {
  await User.deleteOne({ _id: req.params.id });
  res.json({ success: true });
});

app.put('/api/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!(await bcrypt.compare(currentPassword, user.password))) return res.status(401).json({ error: 'Current password is incorrect' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Routes ───────────────────────────────────────────────────

// Dashboard stats
app.get('/api/stats', auth, async (req, res) => {
  const activePods = await Pod.countDocuments({ archived: { $ne: true } });
  const archivedPods = await Pod.countDocuments({ archived: true });
  const totalNotes = await Note.countDocuments();
  const activeAgg = await Pod.aggregate([
    { $match: { archived: { $ne: true } } },
    { $group: { _id: null, pallets: { $sum: '$pallets' }, units: { $sum: '$totalUnits' } } }
  ]);
  const allAgg = await Pod.aggregate([
    { $group: { _id: null, pallets: { $sum: '$pallets' }, units: { $sum: '$totalUnits' } } }
  ]);
  res.json({
    activePods, archivedPods, totalNotes,
    activePallets: activeAgg[0]?.pallets || 0, activeUnits: activeAgg[0]?.units || 0,
    totalPallets: allAgg[0]?.pallets || 0, totalUnits: allAgg[0]?.units || 0
  });
});

// Search PODs
app.get('/api/pods/search', auth, async (req, res) => {
  const { q, from, to } = req.query;
  const filter = {};
  if (q) {
    const regex = new RegExp(q, 'i');
    filter.$or = [{ gtr: regex }, { sct: regex }, { receivedBy: regex }];
  }
  if (from || to) {
    filter.receivedDate = {};
    if (from) filter.receivedDate.$gte = from;
    if (to) filter.receivedDate.$lte = to;
  }
  const pods = await Pod.find(filter).sort({ createdAt: -1 }).lean();
  res.json(pods);
});

// Export PODs as CSV
app.get('/api/pods/export', auth,  async (req, res) => {
  const filter = req.query.archived === 'true' ? { archived: true } : {};
  const pods = await Pod.find(filter).sort({ createdAt: -1 }).lean();
  const header = 'GTR,SCT,Date Shipped,Date Received,Received By,Pallets,Total Units,Archived\n';
  const rows = pods.map(p => `"${p.gtr}","${p.sct}","${p.dateShipped}","${p.receivedDate}","${p.receivedBy}",${p.pallets},${p.totalUnits},${p.archived || false}`).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="pods-export.csv"');
  res.send(header + rows);
});

// Export collection notes as CSV
app.get('/api/collection-notes/export', auth, async (req, res) => {
  const notes = await Note.find().sort({ createdDate: -1 }).lean();
  const header = 'Note ID,Period Start,Period End,Driver,Farm,PODs Count,Total Pallets,Total Units,Created\n';
  const rows = notes.map(n => {
    const tp = n.pods.reduce((s, p) => s + (p.pallets || 0), 0);
    const tu = n.pods.reduce((s, p) => s + (p.totalUnits || 0), 0);
    return `"${n.noteId}","${n.periodStart}","${n.periodEnd}","${n.driverName}","${n.farmDestination || ''}",${n.pods.length},${tp},${tu.toFixed(2)},"${n.createdDate}"`;
  }).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="collection-notes-export.csv"');
  res.send(header + rows);
});

// Check for duplicate GTR/SCT
app.get('/api/pods/check-duplicate', auth, async (req, res) => {
  const { gtr, sct } = req.query;
  const filter = { $or: [] };
  if (gtr) filter.$or.push({ gtr: new RegExp('^' + gtr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
  if (sct) filter.$or.push({ sct: new RegExp('^' + sct.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
  if (filter.$or.length === 0) return res.json({ duplicate: false });
  const existing = await Pod.findOne(filter).lean();
  res.json({ duplicate: !!existing, existing: existing ? { gtr: existing.gtr, sct: existing.sct, receivedDate: existing.receivedDate, archived: existing.archived } : null });
});

// Log a single POD (with optional photo)
app.post('/api/pod', auth, upload.single('photo'), async (req, res) => {
  try {
    const pod = await Pod.create({
      gtr: req.body.gtr || '',
      sct: req.body.sct || '',
      dateShipped: req.body.dateShipped || '',
      receivedDate: req.body.receivedDate || new Date().toISOString().split('T')[0],
      receivedBy: req.body.receivedBy || '',
      pallets: parseInt(req.body.pallets) || 0,
      totalUnits: parseFloat(req.body.totalUnits) || 0,
      photo: req.file ? `uploads/${req.file.filename}` : null
    });
    res.json({ success: true, pod });
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.get('/api/pods', auth, async (req, res) => {
  const filter = req.query.archived === 'true' ? { archived: true } : { archived: { $ne: true } };
  const pods = await Pod.find(filter).sort({ createdAt: -1 }).lean();
  res.json(pods);
});

app.put('/api/pod/:podId', auth, upload.single('photo'), async (req, res) => {
  try {
    const update = {
      gtr: req.body.gtr || '',
      sct: req.body.sct || '',
      dateShipped: req.body.dateShipped || '',
      receivedDate: req.body.receivedDate || '',
      receivedBy: req.body.receivedBy || '',
      pallets: parseInt(req.body.pallets) || 0,
      totalUnits: parseFloat(req.body.totalUnits) || 0
    };
    if (req.file) update.photo = `uploads/${req.file.filename}`;
    const pod = await Pod.findOneAndUpdate({ podId: req.params.podId }, update, { new: true }).lean();
    if (!pod) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, pod });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/pod/:podId', auth, async (req, res) => {
  await Pod.deleteOne({ podId: req.params.podId });
  res.json({ success: true });
});

// Create collection note from selected PODs
app.post('/api/collection-note', auth, upload.single('manifestPhoto'), async (req, res) => {
  try {
    const podIds = JSON.parse(req.body.podIds || '[]');
    const { driverName, vehicleInfo, farmDestination, accountantEmail,
            driverSignature, periodStart, periodEnd, manifestNumber, collectionNoteNo } = req.body;
    const selectedPods = await Pod.find({ podId: { $in: podIds } }).lean();
    if (selectedPods.length === 0) return res.status(400).json({ error: 'No PODs selected' });

    const note = await Note.create({
      pods: selectedPods, driverName, vehicleInfo, farmDestination,
      accountantEmail, farmEmail, myEmail, manifestNumber, driverSignature, periodStart, periodEnd, collectionNoteNo, farmName,
      manifestPhoto: req.file ? `uploads/${req.file.filename}` : null
    });

    await Pod.updateMany({ podId: { $in: podIds } }, { archived: true, collectionNoteId: note.noteId });

    res.json({ success: true, noteId: note.noteId });

    setTimeout(async () => {
      try {
        const photoFiles = selectedPods.map(p => p.photo).filter(Boolean);
        const results = await sendCollectionEmail(note.toObject(), photoFiles);
        const emailStatus = (Array.isArray(results) ? results : []).map(r => ({ to: r.to, sent: r.sent, error: r.error || '', sentAt: new Date() }));
        await Note.updateOne({ noteId: note.noteId }, { emailStatus });
      } catch (err) { console.error('Email failed:', err.message); }
    }, 100);
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.get('/api/collection-notes', auth, async (req, res) => {
  const notes = await Note.find().sort({ createdDate: -1 }).lean();
  res.json(notes);
});

app.get('/api/collection-note/:noteId/pdf', auth, async (req, res) => {
  const note = await Note.findOne({ noteId: req.params.noteId }).lean();
  if (!note) return res.status(404).json({ error: 'Not found' });
  const pdfBuffer = await generateCollectionPDF(note);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="collection-note-${note.noteId}.pdf"`);
  res.send(pdfBuffer);
});

// Resend collection note email
app.post('/api/collection-note/:noteId/resend', auth, async (req, res) => {
  try {
    const note = await Note.findOne({ noteId: req.params.noteId }).lean();
    if (!note) return res.status(404).json({ error: 'Not found' });
    if (req.body.accountantEmail) note.accountantEmail = req.body.accountantEmail;
    const photoFiles = note.pods.map(p => p.photo).filter(Boolean);
    const results = await sendCollectionEmail(note, photoFiles);
    res.json({ success: true, results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/email/status', (req, res) => {
  res.json({ configured: !!process.env.RESEND_API_KEY });
});

app.get('/api/version', (req, res) => res.json({ version: 12 }));

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

function generateDestructionCertPDF(cert) {
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

async function sendDestructionCertEmail(cert) {
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

// Destruction certificate routes
app.post('/api/destruction-cert', auth, upload.none(), async (req, res) => {
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
    // If saved by farm, send email to Clem + Lucia with all docs
    if (req.user && req.user.role === 'farm') {
      sendDestructionCertEmail(cert).catch(e => console.error('Cert email error:', e));
    }
    res.json({ success: true, certId: cert.certId });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// Farm portal: get only notes/certs relevant to this farm user
app.get('/api/farm/notes', auth, async (req, res) => {
  const query = req.user.role === 'farm'
    ? { farmName: req.user.username }
    : {};
  const notes = await Note.find(query).sort({ createdDate: -1 }).lean();
  res.json(notes);
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

// Sage CSV export for a collection note
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`POD Tracking Server running on port ${PORT}`));
