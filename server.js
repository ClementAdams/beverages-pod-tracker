const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

// UBC can volumes database
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

// In-memory storage (use database in production)
const podRecords = new Map();
const collectionNotes = new Map();

// Scan and parse POD
app.post('/api/pod/scan', upload.single('image'), async (req, res) => {
  try {
    const podId = uuidv4();
    const gtr = req.body.gtr || 'PENDING';
    const sct = req.body.sct || 'PENDING';
    const dateShipped = req.body.dateShipped || new Date().toISOString().split('T')[0];
    const receivedDate = new Date().toISOString().split('T')[0];

    const podData = {
      podId,
      gtr,
      sct,
      dateShipped,
      receivedDate,
      items: JSON.parse(req.body.items || '[]'),
      imagePath: req.file ? req.file.path : null,
      totalQuantity: 0,
      totalLitres: 0,
      status: 'received'
    };

    // Calculate totals
    podData.items.forEach(item => {
      podData.totalQuantity += item.quantity;
      podData.totalLitres += (item.quantity * item.volumeMl) / 1000;
    });

    podRecords.set(podId, podData);
    res.json({ success: true, podId, podData });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get POD details
app.get('/api/pod/:podId', (req, res) => {
  const pod = podRecords.get(req.params.podId);
  if (!pod) return res.status(404).json({ error: 'POD not found' });
  res.json(pod);
});

// Create collection note
app.post('/api/collection-note', (req, res) => {
  try {
    const { podId, driverName, vehicleInfo, farmDestination } = req.body;
    const pod = podRecords.get(podId);
    
    if (!pod) return res.status(404).json({ error: 'POD not found' });

    const noteId = uuidv4();
    const collectionData = {
      noteId,
      podId,
      driverName,
      vehicleInfo,
      farmDestination,
      createdDate: new Date().toISOString(),
      podData: pod,
      signatures: {
        driver: null,
        accountant: null,
        farm: null
      }
    };

    collectionNotes.set(noteId, collectionData);
    res.json({ success: true, noteId, collectionData });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Generate PDF collection note
app.get('/api/collection-note/:noteId/pdf', (req, res) => {
  const note = collectionNotes.get(req.params.noteId);
  if (!note) return res.status(404).json({ error: 'Collection note not found' });

  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="collection-note-${note.noteId}.pdf"`);

  doc.pipe(res);

  // Header
  doc.fontSize(20).font('Helvetica-Bold').text('COLLECTION NOTE', 50, 50);
  doc.fontSize(10).font('Helvetica').text(`Note ID: ${note.noteId}`, 50, 75);
  doc.text(`Date: ${new Date(note.createdDate).toLocaleDateString()}`, 50, 90);

  // POD Details
  doc.fontSize(12).font('Helvetica-Bold').text('POD Details', 50, 120);
  const podData = note.podData;
  doc.fontSize(10).font('Helvetica')
    .text(`GTR Reference: ${podData.gtr}`, 50, 140)
    .text(`SCT Number: ${podData.sct}`, 50, 155)
    .text(`Date Shipped: ${podData.dateShipped}`, 50, 170)
    .text(`Received Date: ${podData.receivedDate}`, 50, 185);

  // Items Table
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

  // Totals
  doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
  doc.font('Helvetica-Bold').fontSize(10);
  yPos += 10;
  doc.text(`Total Quantity: ${podData.totalQuantity} units`, 50, yPos);
  doc.text(`Total Litres: ${podData.totalLitres.toFixed(2)}L`, 50, yPos + 20);

  // Collection Info
  yPos += 60;
  doc.fontSize(12).font('Helvetica-Bold').text('Collection Details', 50, yPos);
  doc.fontSize(10).font('Helvetica')
    .text(`Driver Name: ${note.driverName || '_________________'}`, 50, yPos + 30)
    .text(`Vehicle Info: ${note.vehicleInfo || '_________________'}`, 50, yPos + 50)
    .text(`Farm Destination: ${note.farmDestination || '_________________'}`, 50, yPos + 70);

  // Signatures
  yPos += 120;
  doc.fontSize(10);
  doc.text('Driver Signature: ___________________', 50, yPos);
  doc.text('Driver Date: ___________________', 50, yPos + 30);
  doc.text('Accountant Sign-off: ___________________', 300, yPos);
  doc.text('Farm Received: ___________________', 300, yPos + 30);

  doc.end();
});

// Get UBC cans
app.get('/api/ubc-cans', (req, res) => {
  res.json(UBC_CANS);
});

// Update collection note with signature
app.patch('/api/collection-note/:noteId/sign', (req, res) => {
  const note = collectionNotes.get(req.params.noteId);
  if (!note) return res.status(404).json({ error: 'Collection note not found' });

  const { role, signatureData } = req.body;
  if (['driver', 'accountant', 'farm'].includes(role)) {
    note.signatures[role] = signatureData;
  }

  res.json({ success: true, note });
});

// List all PODs
app.get('/api/pods', (req, res) => {
  const pods = Array.from(podRecords.values()).map(p => ({
    podId: p.podId,
    gtr: p.gtr,
    sct: p.sct,
    receivedDate: p.receivedDate,
    totalQuantity: p.totalQuantity,
    totalLitres: p.totalLitres.toFixed(2),
    status: p.status
  }));
  res.json(pods);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`POD Tracking Server running on port ${PORT}`);
});
