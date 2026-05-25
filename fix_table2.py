with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

old = """    const colX = [40, 125, 205, 285, 370, 420, 478];
    const headers = ['GTR', 'SCT', 'Date Shipped', 'Date Received', 'Pallets', 'Units', 'Received By'];
    doc.fontSize(8).font('Helvetica-Bold');
    const colW = [80, 75, 75, 80, 45, 53, 80];
    headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { width: colW[i], continued: i < headers.length - 1 }));
    doc.text('');
    let y = doc.y + 2;
    doc.moveTo(40, y).lineTo(570, y).stroke();
    y += 5;

    doc.font('Helvetica').fontSize(8);
    note.pods.forEach(p => {
      if (y > 700) { doc.addPage(); y = 40; }
      doc.text(p.gtr || '-', colX[0], y, { width: colW[0] });
      doc.text(p.sct || '-', colX[1], y, { width: colW[1] });
      doc.text(p.dateShipped || '-', colX[2], y, { width: colW[2] });
      doc.text(p.receivedDate || '-', colX[3], y, { width: colW[3] });
      doc.text(String(p.pallets || 0), colX[4], y, { width: colW[4] });
      doc.text(String(p.totalUnits || 0), colX[5], y, { width: colW[5] });
      doc.text(p.receivedBy || '-', colX[6], y, { width: colW[6] });
      y += 18;
    });"""

new = """    // Table layout: page width 595, margins 40 each side = 515 usable
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
    });"""

assert content.count(old) == 1, "FAIL: block not found. Count=" + str(content.count(old))
content = content.replace(old, new, 1)
print("OK: table section replaced")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Saved.")
