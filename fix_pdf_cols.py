with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Column X positions - spread them out properly across 530px (40 to 570)
# GTR=40, SCT=130, Shipped=210, Received=295, Pallets=375, Units=425, ReceivedBy=480
old_colX = "    const colX = [40, 130, 210, 300, 380, 440, 510];"
new_colX = "    const colX = [40, 125, 205, 285, 370, 420, 478];"
assert content.count(old_colX) == 1, "FAIL colX: " + str(content.count(old_colX))
content = content.replace(old_colX, new_colX, 1)
print("OK 1: colX positions updated")

# Fix 2: Column widths in header row - match colX gaps
old_hdr = "    headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { width: 70, continued: i < headers.length - 1 }));"
new_hdr = "    const colW = [80, 75, 75, 80, 45, 53, 80];\n    headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { width: colW[i], continued: i < headers.length - 1 }));"
assert content.count(old_hdr) == 1, "FAIL hdr: " + str(content.count(old_hdr))
content = content.replace(old_hdr, new_hdr, 1)
print("OK 2: header column widths updated")

# Fix 3: Data rows - use same colW array widths
old_rows = """      doc.text(p.gtr || '-', colX[0], y, { width: 85 });
      doc.text(p.sct || '-', colX[1], y, { width: 75 });
      doc.text(p.dateShipped || '-', colX[2], y, { width: 85 });
      doc.text(p.receivedDate || '-', colX[3], y, { width: 75 });
      doc.text(String(p.pallets || 0), colX[4], y, { width: 55 });
      doc.text(`${p.totalUnits || 0}`, colX[5], y, { width: 65 });
      doc.text(p.receivedBy || '-', colX[6], y, { width: 60 });"""
new_rows = """      doc.text(p.gtr || '-', colX[0], y, { width: colW[0] });
      doc.text(p.sct || '-', colX[1], y, { width: colW[1] });
      doc.text(p.dateShipped || '-', colX[2], y, { width: colW[2] });
      doc.text(p.receivedDate || '-', colX[3], y, { width: colW[3] });
      doc.text(String(p.pallets || 0), colX[4], y, { width: colW[4] });
      doc.text(String(p.totalUnits || 0), colX[5], y, { width: colW[5] });
      doc.text(p.receivedBy || '-', colX[6], y, { width: colW[6] });"""
assert content.count(old_rows) == 1, "FAIL rows: " + str(content.count(old_rows))
content = content.replace(old_rows, new_rows, 1)
print("OK 3: data row widths updated")

# Fix 4: Header labels - Date Shipped, Date Received
old_hdrs = "    const headers = ['GTR', 'SCT', 'Shipped', 'Received', 'Pallets', 'Units', 'Received By'];"
new_hdrs = "    const headers = ['GTR', 'SCT', 'Date Shipped', 'Date Received', 'Pallets', 'Units', 'Received By'];"
assert content.count(old_hdrs) == 1, "FAIL headers label: " + str(content.count(old_hdrs))
content = content.replace(old_hdrs, new_hdrs, 1)
print("OK 4: header labels updated")

# Fix 5: Farm Destination default to Osdam Farm
old_farm = "doc.text(`Farm / Destination: ${note.farmDestination || '_________________'}`, 40, y);"
new_farm = "doc.text(`Farm / Destination: ${note.farmDestination || 'Osdam Farm'}`, 40, y);"
if content.count(old_farm) == 1:
    content = content.replace(old_farm, new_farm, 1)
    print("OK 5: Farm Destination default set to Osdam Farm")
else:
    print("NOTE 5: farm destination line not found as expected:", content.count(old_farm))

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("server.js saved successfully.")
